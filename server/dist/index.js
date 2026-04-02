"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const nanoid_1 = require("nanoid");
const lru_cache_1 = require("lru-cache");
const logger_1 = require("./logger");
const aws_1 = require("./aws");
const socket_io_1 = require("socket.io");
const constants_1 = require("./constants");
const CFG = __importStar(require("./config"));
const allowedOrigins = [
    "http://localhost:4173", // local vite prod frontend
    "http://localhost:5173", // local vite dev frontend
    "https://192.168.2.12:5173", // local LAN vite frontend
    CFG.CLIENT_DEPLOYMENT_URL, // deployed client url (currently using Cloudflare Pages)
    CFG.CLIENT_ALT_DEPLOYMENT_URL // additional subdomain/domain
];
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
const chat = io.of("/chat");
const ipCache = {};
const usersBySocketId = {};
const pendingMessages = new lru_cache_1.LRUCache({
    ttl: 60 * 1000, // each message token is valid for 1 minute
    max: 1024, // safety cap to avoid memory blowup (each entry is 200-300KB)
});
let activeConnections = 0;
let totalMessagesToday = 0;
let totalImagesToday = 0;
process.on("uncaughtException", (err) => {
    logger_1.logger.error(`${constants_1.SERVER_MESSAGES.SERVER_ERROR}: ${err}`);
    shutdown();
});
process.on("unhandledRejection", (err) => {
    logger_1.logger.error(`${constants_1.SERVER_MESSAGES.SERVER_ERROR}: ${err}`);
    shutdown();
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
        return next(new Error(`${constants_1.SERVER_MESSAGES.CF_MISSING}. ${constants_1.SERVER_MESSAGES.CLIENT_UNEXPECTED}`)); // fail fast if token not present
    try {
        let params = new URLSearchParams();
        params.append('secret', CFG.TURNSTILE_SECRET);
        params.append('response', token);
        const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            body: params,
            method: "POST",
        });
        const data = await res.json();
        if (!data.success) {
            let msg = `${constants_1.SERVER_MESSAGES.CF_FAILED}`;
            if (data["error-codes"]?.includes("timeout-or-duplicate")) {
                msg = `${constants_1.SERVER_MESSAGES.CF_EXPIRED}. ${constants_1.SERVER_MESSAGES.CLIENT_RELOAD}`;
            }
            else if (data["error-codes"]?.includes("invalid-input-response")) {
                msg = `${constants_1.SERVER_MESSAGES.CF_INVALID}. ${constants_1.SERVER_MESSAGES.CLIENT_RELOAD}`;
            }
            else if (data["error-codes"]?.includes("missing-input-response")) {
                msg = `${constants_1.SERVER_MESSAGES.CF_MISSING}. ${constants_1.SERVER_MESSAGES.CLIENT_UNEXPECTED}`;
            }
            else if (data["error-codes"]?.includes("bad-request")) {
                msg = `${constants_1.SERVER_MESSAGES.CF_BAD_REQUEST}. ${constants_1.SERVER_MESSAGES.CLIENT_RELOAD}`;
            }
            else if (data["error-codes"]?.includes("internal-error")) {
                msg = `${constants_1.SERVER_MESSAGES.CF_ERROR}. ${constants_1.SERVER_MESSAGES.CLIENT_RELOAD_LATER}`;
            }
            return next(new Error(msg));
        }
        if (activeConnections >= CFG.MAX_CONNECTIONS) {
            return next(new Error(`${constants_1.SERVER_MESSAGES.SERVER_FULL} ${constants_1.SERVER_MESSAGES.CLIENT_DISMISS}`));
        }
        // Check IP and increment ONLY after validation passes
        if (!ipCache[ip]) {
            ipCache[ip] = {
                connections: 0,
                blocked: false,
            };
        }
        ipCache[ip].connections++;
        if (ipCache[ip].blocked) {
            const hoursLeft = hoursUntilReset();
            return next(new Error(`${constants_1.SERVER_MESSAGES.USER_MESSAGE_LIMIT} 
                        You can send messages again in ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}.`));
        }
        if (ipCache[ip].connections > CFG.MAX_CONNECTIONS_FROM_IP) {
            ipCache[ip].connections--;
            return next(new Error(`${constants_1.SERVER_MESSAGES.USER_IP_LIMIT}`));
        }
        next();
    }
    catch (err) {
        logger_1.logger.warn(`${constants_1.SERVER_MESSAGES.CF_ERROR}: ${err}`);
        return next(new Error(`${constants_1.SERVER_MESSAGES.CF_FAILED}`));
    }
});
chat.on("connection", (socket) => {
    activeConnections++;
    const username = socket.data.username;
    const handle = username + (0, nanoid_1.nanoid)(11);
    const usercode = generateUserDiscriminator(username);
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(socket.handshake.headers["user-agent"] || "");
    usersBySocketId[socket.id] = {
        username,
        userHandle: handle,
        userCode: usercode,
        messages: [],
        joinedAt: Date.now(),
        messagesToday: 0,
        imagesToday: 0,
        recentSends: [],
        device: isMobile ? "mobile" : "desktop",
    };
    socket.emit("user-confirm", { name: username, handle: handle });
    broadcastActiveConnections();
    broadcastUsers();
    logger_1.logger.info(`User connected: ${socket.id} (${username})`);
    socket.on("send-intent", async (payload) => {
        if (!payload || typeof payload !== "object")
            return;
        const { textLength, textBytes, files } = payload;
        const user = usersBySocketId[socket.id];
        if (!user)
            return;
        // Check message length and size
        if ((textLength && textLength > CFG.MAX_MESSAGE_LENGTH) ||
            (textBytes && textBytes > CFG.MAX_MESSAGE_SIZE))
            return;
        // Validate files
        let validatedFiles;
        if (Array.isArray(files)) {
            validatedFiles = files.filter((f) => {
                if (!f || typeof f.size !== "number" || f.size <= 0)
                    return false;
                if (!CFG.UPLOAD_ALLOWED_MIME.includes(f.mime))
                    return false;
                // both gifs and images are converted to webp client-side
                // the client code does its best to compress images/gifs within their assigned caps (200,000/250,000)
                // so lets just take 300,000 instead of 200,000 as the upper limit for now.
                return f.size <= CFG.MAX_FILE_SIZE;
            });
            if (validatedFiles?.length) {
                const remainingForUser = CFG.MAX_DAILY_IMAGES_PER_IP - user.imagesToday;
                const remainingForServer = CFG.MAX_DAILY_IMAGES - totalImagesToday;
                const remaining = Math.min(remainingForUser, remainingForServer);
                if (remaining <= 0) {
                    if (remainingForServer < remainingForUser) {
                        socket.emit("server-image-limit"); // server has reached its daily cap for accepting media files
                    }
                    else {
                        socket.emit("image-limit"); // user reached daily image sending cap
                    }
                    validatedFiles = undefined;
                }
                else {
                    validatedFiles = validatedFiles.slice(0, remaining); // don't increment image counter yet (its yet to upload)
                }
            }
        }
        // Check if user has reached the daily cap of messages sent
        if (user.messagesToday >= CFG.MAX_DAILY_MESSAGES_PER_IP) {
            const ip = socket._ip;
            if (ipCache[ip])
                ipCache[ip].blocked = true;
            socket.emit("kicked", `${constants_1.SERVER_MESSAGES.USER_MESSAGE_LIMIT}`);
            logger_1.logger.warn(`User kicked for reaching limit: ${socket.id}`);
            disconnectSocket(socket);
            return;
        }
        // Generate message id
        const messageId = crypto.randomUUID();
        let uploads = [];
        if (textLength && textBytes) {
            const textId = crypto.randomUUID();
            const key = `messages/${messageId}/${textId}`;
            const uploadUrl = await (0, aws_1.createUploadUrl)(key, "application/json");
            uploads.push({
                id: textId,
                key,
                url: uploadUrl,
                type: "text",
            });
        }
        if (validatedFiles?.length) {
            const imageUploads = await Promise.all(validatedFiles.map(async (file) => {
                const fileId = crypto.randomUUID();
                const key = `messages/${messageId}/${fileId}`;
                const uploadUrl = await (0, aws_1.createUploadUrl)(key, file.mime);
                return {
                    id: fileId,
                    key,
                    url: uploadUrl,
                    type: "image",
                };
            }));
            uploads.push(...imageUploads);
        }
        pendingMessages.set(messageId, socket.id);
        socket.emit("send-approval", {
            id: messageId,
            uploads: uploads.length ? uploads : undefined,
        });
    });
    socket.on("send-message", async (payload) => {
        if (totalMessagesToday >= CFG.MAX_DAILY_MESSAGES) {
            socket.emit("server-limit", hoursUntilReset());
            disconnectSocket(socket);
            return;
        }
        if (!payload || typeof payload !== "object")
            return;
        const { id, textKey, images, replyTo } = payload;
        const user = usersBySocketId[socket.id];
        if (!user)
            return;
        if (!id || typeof id !== "string")
            return;
        const owner = pendingMessages.get(id);
        if (owner !== socket.id)
            return;
        pendingMessages.delete(id);
        let validatedReplyTo;
        if (replyTo &&
            typeof replyTo === "object" &&
            typeof replyTo.id === "string" &&
            replyTo.userId &&
            typeof replyTo.userId.name === "string" &&
            typeof replyTo.userId.handle === "string") {
            validatedReplyTo = replyTo;
        }
        let validatedImages;
        if (Array.isArray(images)) {
            const safeImages = images.filter((img) => img &&
                typeof img.id === "string" &&
                typeof img.key === "string" &&
                typeof img.mime === "string" &&
                typeof img.size === "number");
            if (safeImages.length > 0) {
                user.imagesToday += safeImages.length;
                totalImagesToday += safeImages.length;
                validatedImages = safeImages;
            }
        }
        const now = Date.now();
        // For checking if user is spamming
        user.recentSends = user.recentSends.filter(t => now - t < CFG.SPAM_TIME); // Remove timestamps older than SPAM_TIME
        user.recentSends.push(now); // Add current timestamp
        if (user.recentSends.length > CFG.SPAM_THRESHOLD) {
            socket.emit("kicked", `${constants_1.SERVER_MESSAGES.USER_SPAM_KICK}`);
            logger_1.logger.warn(`User kicked for spamming: ${socket.id}`);
            disconnectSocket(socket);
            return;
        }
        else if (user.recentSends.length >= CFG.SPAM_THRESHOLD - 2) {
            socket.emit("warn-kick");
        }
        const textId = textKey?.split("/").at(-1) ?? null;
        const imageIds = validatedImages && validatedImages.length > 0
            ? validatedImages.map(img => img.id)
            : null;
        await (0, aws_1.putMessage)({
            socketId: socket.id,
            createdAt: now,
            messageId: id,
            ...(textId && { textId }),
            ...(imageIds && { imageIds })
        });
        user.messagesToday++;
        totalMessagesToday++;
        // Send/broadcast message to everyone
        chat.emit("new-message", {
            id,
            user: { name: user.username, handle: user.userHandle },
            textKey,
            timestamp: now,
            images: validatedImages,
            replyTo: validatedReplyTo,
        });
    });
    socket.on("delete-message", async (messageId) => {
        if (typeof messageId !== "string")
            return;
        const user = usersBySocketId[socket.id];
        if (!user)
            return;
        try {
            await (0, aws_1.deleteMessage)(socket.id, messageId);
            chat.emit("delete-message-public", messageId);
        }
        catch (err) {
            logger_1.logger.warn("Failed to delete message from DynamoDB: ", err);
        }
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
            user: user.userHandle
        });
    });
    socket.on("edit-message", async (msg) => {
        if (!msg || typeof msg !== "object")
            return;
        const { messageId, text } = msg;
        if (typeof messageId !== "string" ||
            typeof text !== "string")
            return;
        const user = usersBySocketId[socket.id];
        if (!user)
            return;
        const messages = await (0, aws_1.getMessagesBySocket)(socket.id);
        const messageExists = messages.some(m => m.messageId === messageId);
        if (!messageExists)
            return; // message does not belong to this user
        const trimmed = text.trim();
        // prevent empty message
        if (!trimmed)
            return;
        if (trimmed.length > CFG.MAX_MESSAGE_LENGTH)
            return;
        const textBytes = Buffer.byteLength(trimmed, "utf8");
        if (textBytes > CFG.MAX_MESSAGE_SIZE)
            return;
        // broadcast to all users that a message has been edited
        chat.emit("edit-message", {
            messageId,
            text: trimmed,
        });
    });
    socket.on("disconnect", () => {
        onClientDisconnect(socket);
    });
    socket.on("afk-disconnect", () => {
        disconnectSocket(socket);
    });
});
async function onClientDisconnect(socket) {
    if (socket._disconnected)
        return; // already handled, nothing to do
    socket._disconnected = true;
    activeConnections--;
    const ip = socket._ip;
    delete usersBySocketId[socket.id];
    try {
        await (0, aws_1.deleteMessagesBySocket)(socket.id);
    }
    catch (err) {
        logger_1.logger.warn(`Failed to delete messages for socket ${socket.id}:`, err);
    }
    broadcastActiveConnections();
    broadcastUsers();
    if (ip && ipCache[ip]) {
        ipCache[ip].connections = Math.max(0, ipCache[ip].connections - 1);
        if (ipCache[ip].connections === 0 && ipCache[ip].blocked)
            delete ipCache[ip];
    }
    // cleanup pending messages (send-intents) for this socket/user
    for (const [messageId, ownerSocketId] of pendingMessages) {
        if (ownerSocketId === socket.id) {
            pendingMessages.delete(messageId);
        }
    }
    logger_1.logger.info(`User disconnected: ${socket.id}`);
}
function disconnectSocket(socket) {
    onClientDisconnect(socket);
    socket.disconnect(true);
}
function broadcastActiveConnections() {
    chat.emit("active-connections", activeConnections);
}
function broadcastUsers() {
    chat.emit("users-update", Object.values(usersBySocketId).map(user => ({
        username: user.username,
        userHandle: user.userHandle,
        userCode: user.userCode,
        joinedAt: user.joinedAt,
        device: user.device,
    })));
}
function scheduleMidnightReset() {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
        totalMessagesToday = 0;
        totalImagesToday = 0;
        // reset user counters
        for (const socketId in usersBySocketId) {
            usersBySocketId[socketId].messagesToday = 0;
            usersBySocketId[socketId].imagesToday = 0;
        }
        // reset IP blocks
        for (const ip in ipCache) {
            ipCache[ip].blocked = false;
        }
        logger_1.logger.info("Daily usage counters reset.");
        scheduleMidnightReset();
    }, msUntilMidnight);
}
function hoursUntilReset() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // next midnight
    const msLeft = midnight.getTime() - now.getTime();
    if (msLeft < 60 * 1000)
        return 0;
    const hours = Math.ceil(msLeft / (1000 * 60 * 60));
    return hours;
}
function generateUserDiscriminator(username) {
    const used = new Set();
    for (const user of Object.values(usersBySocketId)) {
        if (user.username === username) {
            used.add(user.userCode);
        }
    }
    while (true) {
        const id = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, "0");
        if (!used.has(id))
            return id;
    }
}
function shutdown() {
    server.close(() => {
        process.exit(1);
    });
    // Force exit if close hangs
    setTimeout(() => process.exit(1), 5000);
}
scheduleMidnightReset();
server.listen(CFG.PORT, "0.0.0.0", () => {
    logger_1.logger.info(`Server listening on port ${CFG.PORT}`);
});
