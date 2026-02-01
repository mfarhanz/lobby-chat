import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import dotenv from "dotenv";
import { generateUsername } from "./username";
import { UserMeta, MediaMeta } from "./types/meta";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET as string;
const MAX_CONNECTIONS = 5;
const MAX_MESSAGE_LENGTH = 5000;
const SPAM_THRESHOLD = 5; // max messages
const SPAM_TIME = 10000; // 10 seconds

const connectionsPerIp: Record<string, number> = {};
const usersBySocketId: Record<string, UserMeta> = {};
let activeConnections = 0;

process.on("uncaughtException", (err: unknown) => {
    console.error(err);
});

process.on("unhandledRejection", (err: unknown) => {
    console.error(err);
});

// app.use(express.static("public"));

io.use(async (socket: Socket & { _ip?: string }, next) => {
    const ip =
        (socket.handshake.headers["cf-connecting-ip"] as string) ||
        (socket.handshake.headers["x-forwarded-for"] as string | undefined)
            ?.split(",")[0] ||
        socket.handshake.address;
    socket._ip = ip;

    // connectionsPerIp[ip] = (connectionsPerIp[ip] || 0) + 1;     // temporary
    // if (connectionsPerIp[ip] > MAX_CONNECTIONS) {
    //     connectionsPerIp[ip]--;
    //     return next(new Error("Too many connections from this IP"));
    // }
    // return next();

    const token = socket.handshake.auth?.turnstileToken as string | undefined;
    if (!token) {
        return next(new Error("No Turnstile token provided"));
    }

    try {
        let params = new URLSearchParams();
        params.append('secret', TURNSTILE_SECRET);
        params.append('response', token);

        const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            body: params,
            method: "POST",
        });

        const data: { success?: boolean } = await res.json();

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
    } catch (err) {
        return next(new Error("Turnstile validation error"));
    }
});

io.on("connection", (socket: Socket & { _ip?: string }) => {
    activeConnections++;
    const username = generateUsername();
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

    console.log("User connected:", socket.id, username);

    socket.on("send-message", (msg: unknown) => {
        if (
            !msg ||
            typeof msg !== "object" ||
            typeof (msg as any).text !== "string"
        ) return;

        const { text, replyTo } = msg as {
            text: string;
            replyTo?: {
                id: string;
                user: string;
            };
        };

        let validatedReplyTo: {
            id: string;
            user: string;
        } | undefined;

        if (
            replyTo &&
            typeof replyTo === "object" &&
            typeof replyTo.id === "string" &&
            typeof replyTo.user === "string"
        ) {
            validatedReplyTo = {
                id: replyTo.id,
                user: replyTo.user,
            };
        }

        let validatedImages: MediaMeta[] | undefined;
        if (Array.isArray((msg as any).images)) {
            const images = (msg as any).images;
            const safeImages = images.filter((img: any) =>
                img &&
                typeof img === "object" &&
                typeof img.id === "string" &&
                typeof img.key === "string" &&
                typeof img.url === "string" &&
                typeof img.mime === "string" &&
                typeof img.size === "number"
            );

            if (safeImages.length > 0) validatedImages = safeImages;
        }

        if (text.length > MAX_MESSAGE_LENGTH) return;

        const user = usersBySocketId[socket.id];
        if (!user) return;

        const now = Date.now();
        const messageId = crypto.randomUUID();

        // Remove timestamps older than SPAM_TIME
        user.recentSends = user.recentSends.filter(t => now - t < SPAM_TIME);

        // Add current timestamp
        user.recentSends.push(now);
        // Check if user is spamming
        if (user.recentSends.length > SPAM_THRESHOLD) {
            socket.emit("kicked", "You have been kicked for spamming.");
            setTimeout(() => socket.disconnect(), 150);
            return;
        }

        user.messages.push({    // for delete purposes - store in database later
            id: messageId,
            createdAt: now,
        });

        // send message to everyone
        io.emit("new-message", {
            id: messageId,
            user: user.username,
            text,
            timestamp: now,
            images: validatedImages,
            replyTo: validatedReplyTo,
        });
    });

    socket.on("delete-message", (messageId: unknown) => {
        if (typeof messageId !== "string") return;

        const user = usersBySocketId[socket.id];
        if (!user) return;

        const msgIndex = user.messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) {
            // Message does not belong to this user
            return;
        }

        // Remove this message from the user's list
        user.messages.splice(msgIndex, 1);

        io.emit("delete-message-public", messageId);
    });

    socket.on("add-reaction", (msg: unknown) => {
        if (!msg || typeof msg !== "object") return;

        const { messageId, emoji } = msg as { messageId: string; emoji: string };
        if (
            typeof messageId !== "string" ||
            typeof emoji !== "string"
        ) return;

        const user = usersBySocketId[socket.id];
        if (!user) return;

        io.emit("add-reaction", {
            messageId,
            emoji,
            user: user.username
        });
    });

    socket.on("edit-message", (msg: unknown) => {
        if (!msg || typeof msg !== "object") return;

        const { messageId, text } = msg as { messageId: string; text: string };
        if (
            typeof messageId !== "string" ||
            typeof text !== "string"
        ) return;

        const user = usersBySocketId[socket.id];
        if (!user) return;

        const msgIndex = user.messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) {
            // message does not belong to this user
            return;
        }

        // broadcast to all users that a message has been edited
        io.emit("edit-message", {
            messageId,
            text,
        });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
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

function broadcastActiveConnections(): void {
    io.emit("active-connections", activeConnections);
}

function broadcastUsers(): void {
    io.emit(
        "users-update",
        Object.values(usersBySocketId).map(user => ({
            username: user.username,
            joinedAt: user.joinedAt,
            device: user.device,
        }))
    );
}

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
