"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./logger");
const socket_io_1 = require("socket.io");
dotenv_1.default.config();
const allowedOrigins = [
    "http://localhost:5173", // local vite dev frontend
    "https://lobbychat.pages.dev", // Cloudflare Pages deployed client
    "https://chat.mfarhanz.dev", // additional subdomain of mine
];
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;
const PORT = Number(process.env.PORT) || 3000;
const MAX_CONNECTIONS = 3; // max connections from one client
const MAX_MESSAGE_LENGTH = 5000;
const SPAM_THRESHOLD = 8; // max messages within spam time
const SPAM_TIME = 10000; // 10 seconds
const app = (0, express_1.default)();
app.set("trust proxy", true);
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    // path: "/socket",
    transports: ["polling", "websocket"],
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});
const connectionsPerIp = {};
const usersBySocketId = {};
const chat = io.of("/chat");
let activeConnections = 0;
process.on("uncaughtException", (err) => {
    logger_1.logger.error(`Internal Server Error: ${err}`);
});
process.on("unhandledRejection", (err) => {
    logger_1.logger.error(`Internal Server Error: ${err}`);
});
chat.use(async (socket, next) => {
    const ip = socket.handshake.headers["cf-connecting-ip"] ||
        socket.handshake.headers["x-forwarded-for"]
            ?.split(",")[0] ||
        socket.handshake.address;
    socket._ip = ip;
    const username = socket.handshake.auth.username;
    if (!username || typeof username !== "string")
        return next(new Error("Username required"));
    else
        socket.data.username = username;
    const token = socket.handshake.auth?.turnstileToken;
    if (!token)
        return next(new Error("No Turnstile token provided"));
    // return next();  // temporary for dev
    try {
        let params = new URLSearchParams();
        params.append('secret', TURNSTILE_SECRET);
        params.append('response', token);
        const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            body: params,
            method: "POST",
        });
        const data = await res.json();
        if (!data.success) {
            return next(new Error("Turnstile validation failed"));
        }
        // Increment ONLY after validation passes
        connectionsPerIp[ip] = (connectionsPerIp[ip] || 0) + 1;
        if (connectionsPerIp[ip] > MAX_CONNECTIONS) {
            connectionsPerIp[ip]--;
            return next(new Error("Too many connections from this IP"));
        }
        next();
    }
    catch (err) {
        return next(new Error("Turnstile validation error"));
    }
});
chat.on("connection", (socket) => {
    activeConnections++;
    const username = socket.data.username;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(socket.handshake.headers["user-agent"] || "");
    usersBySocketId[socket.id] = {
        username,
        recentSends: [],
        messages: [],
        joinedAt: Date.now(),
        device: isMobile ? "mobile" : "desktop",
    };
    socket.emit("username", username);
    broadcastActiveConnections();
    broadcastUsers();
    logger_1.logger.info(`User connected: ${socket.id} (${username})`);
    socket.on("send-message", (msg) => {
        if (!msg ||
            typeof msg !== "object" ||
            typeof msg.text !== "string")
            return;
        const { text, replyTo } = msg;
        let validatedReplyTo;
        if (replyTo &&
            typeof replyTo === "object" &&
            typeof replyTo.id === "string" &&
            typeof replyTo.user === "string") {
            validatedReplyTo = {
                id: replyTo.id,
                user: replyTo.user,
            };
        }
        let validatedImages;
        if (Array.isArray(msg.images)) {
            const images = msg.images;
            const safeImages = images.filter((img) => img &&
                typeof img === "object" &&
                typeof img.id === "string" &&
                typeof img.key === "string" &&
                typeof img.url === "string" &&
                typeof img.mime === "string" &&
                typeof img.size === "number");
            if (safeImages.length > 0)
                validatedImages = safeImages;
        }
        if (text.length > MAX_MESSAGE_LENGTH)
            return;
        const user = usersBySocketId[socket.id];
        if (!user)
            return;
        const now = Date.now();
        const messageId = crypto.randomUUID();
        // Remove timestamps older than SPAM_TIME
        user.recentSends = user.recentSends.filter(t => now - t < SPAM_TIME);
        // Add current timestamp
        user.recentSends.push(now);
        // Check if user is spamming
        if (user.recentSends.length > SPAM_THRESHOLD) {
            socket.emit("kicked", "You have been kicked for spamming.");
            logger_1.logger.info(`User kicked: ${socket.id}`);
            setTimeout(() => socket.disconnect(), 150);
            return;
        }
        user.messages.push({
            id: messageId,
            createdAt: now,
        });
        // send message to everyone
        chat.emit("new-message", {
            id: messageId,
            user: user.username,
            text,
            timestamp: now,
            images: validatedImages,
            replyTo: validatedReplyTo,
        });
    });
    socket.on("delete-message", (messageId) => {
        if (typeof messageId !== "string")
            return;
        const user = usersBySocketId[socket.id];
        if (!user)
            return;
        const msgIndex = user.messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) {
            // Message does not belong to this user
            return;
        }
        // Remove this message from the user's list
        user.messages.splice(msgIndex, 1);
        chat.emit("delete-message-public", messageId);
    });
    socket.on("add-reaction", (msg) => {
        if (!msg || typeof msg !== "object")
            return;
        const { messageId, emoji } = msg;
        if (typeof messageId !== "string" ||
            typeof emoji !== "string")
            return;
        const user = usersBySocketId[socket.id];
        if (!user)
            return;
        chat.emit("add-reaction", {
            messageId,
            emoji,
            user: user.username
        });
    });
    socket.on("edit-message", (msg) => {
        if (!msg || typeof msg !== "object")
            return;
        const { messageId, text } = msg;
        if (typeof messageId !== "string" ||
            typeof text !== "string")
            return;
        const user = usersBySocketId[socket.id];
        if (!user)
            return;
        const msgIndex = user.messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) {
            // message does not belong to this user
            return;
        }
        // broadcast to all users that a message has been edited
        chat.emit("edit-message", {
            messageId,
            text,
        });
    });
    socket.on("disconnect", () => {
        logger_1.logger.info(`User disconnected: ${socket.id}`);
        activeConnections--;
        const ip = socket._ip;
        delete usersBySocketId[socket.id];
        broadcastActiveConnections();
        broadcastUsers();
        if (ip && connectionsPerIp[ip]) {
            connectionsPerIp[ip]--;
            if (connectionsPerIp[ip] <= 0) {
                delete connectionsPerIp[ip];
            }
        }
    });
});
function broadcastActiveConnections() {
    chat.emit("active-connections", activeConnections);
}
function broadcastUsers() {
    chat.emit("users-update", Object.values(usersBySocketId).map(user => ({
        username: user.username,
        joinedAt: user.joinedAt,
        device: user.device,
    })));
}
server.listen(PORT, "0.0.0.0", () => {
    logger_1.logger.info(`Server listening on port ${PORT}`);
});
