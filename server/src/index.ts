import express from "express";
import http from "http";
import { nanoid } from "nanoid";
import { logger } from "./logger";
import { Server, Socket } from "socket.io";
import { UserMeta, MediaMeta, IpMeta } from "./types/meta";
import { SERVER_MESSAGES as SV } from "./constants";
import * as CFG from "./config";

const allowedOrigins = [
    "http://localhost:4173",            // local vite prod frontend
    "http://localhost:5173",           // local vite dev frontend
    "https://lobbychat.pages.dev",     // Cloudflare Pages deployed client
    "https://chat.mfarhanz.dev",       // additional subdomain of mine
    "http://192.168.2.12:5173"          // local LAN vite frontend
];

const app = express();
app.set("trust proxy", true);
const server = http.createServer(app);
const io = new Server(server, {
    // path: "/socket",
    transports: ["polling", "websocket"],
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});

const ipCache: Record<string, IpMeta> = {};
const usersBySocketId: Record<string, UserMeta> = {};
const chat = io.of("/chat");

let activeConnections = 0;
let totalMessagesToday = 0;

process.on("uncaughtException", (err: unknown) => {
    logger.error(`${SV.SERVER_ERROR}: ${err}`);
    shutdown();
});

process.on("unhandledRejection", (err: unknown) => {
    logger.error(`${SV.SERVER_ERROR}: ${err}`);
    shutdown();
});

chat.use(async (socket: Socket & { _ip?: string }, next) => {
    const ip =
        (socket.handshake.headers["cf-connecting-ip"] as string) ||
        (socket.handshake.headers["x-forwarded-for"] as string | undefined)
            ?.split(",")[0] ||
        socket.handshake.address;
    socket._ip = ip;

    const username = socket.handshake.auth.username;
    if (!username || typeof username !== "string") return next(new Error("Username required"));
    else socket.data.username = username;

    const token = socket.handshake.auth?.turnstileToken as string | undefined;
    if (!token) return next(new Error(`${SV.CF_MISSING}: ${SV.CLIENT_UNEXPECTED}`)); // fail fast if token not present

    // return next();  // temporary for dev

    try {
        let params = new URLSearchParams();
        params.append('secret', CFG.TURNSTILE_SECRET);
        params.append('response', token);

        const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            body: params,
            method: "POST",
        });

        const data: { success?: boolean; "error-codes"?: string[] } = await res.json();
        if (!data.success) {
            let msg = `${SV.CF_FAILED}`;
            if (data["error-codes"]?.includes("timeout-or-duplicate")) {
                msg = `${SV.CF_EXPIRED}: ${SV.CLIENT_RELOAD}`;
            } else if (data["error-codes"]?.includes("invalid-input-response")) {
                msg = `${SV.CF_INVALID}: ${SV.CLIENT_RELOAD}`;
            } else if (data["error-codes"]?.includes("missing-input-response")) {
                msg = `${SV.CF_MISSING}: ${SV.CLIENT_UNEXPECTED}`;
            } else if (data["error-codes"]?.includes("bad-request")) {
                msg = `${SV.CF_BAD_REQUEST}: ${SV.CLIENT_RELOAD}`;
            } else if (data["error-codes"]?.includes("internal-error")) {
                msg = `${SV.CF_ERROR}: ${SV.CLIENT_RELOAD_LATER}`;
            }
            return next(new Error(msg));
        }

        if (activeConnections >= CFG.MAX_CONNECTIONS) {
            return next(new Error(`${SV.SERVER_FULL} ${SV.CLIENT_DISMISS}`));
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
            return next(new Error(`${SV.USER_MESSAGE_LIMIT} 
                        You can send messages again in ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}.`));
        }
        if (ipCache[ip].connections > CFG.MAX_CONNECTIONS_FROM_IP) {
            ipCache[ip].connections--;
            return next(new Error(`${SV.USER_IP_LIMIT}`));
        }

        next();
    } catch (err) {
        logger.warn(`${SV.CF_ERROR}: ${err}`)
        return next(new Error(`${SV.CF_FAILED}`));
    }
});

chat.on("connection", (socket: Socket & { _ip?: string }) => {
    activeConnections++;
    const username = socket.data.username;
    const handle = username + nanoid(11);
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

    logger.info(`User connected: ${socket.id} (${username})`);

    socket.on("send-message", (msg: unknown) => {
        if (totalMessagesToday >= CFG.MAX_DAILY_MESSAGES) {
            socket.emit("server-limit", hoursUntilReset());
            disconnectSocket(socket);
            return;
        }

        if (
            !msg ||
            typeof msg !== "object" ||
            typeof (msg as any).text !== "string"
        ) return;

        const { text, replyTo } = msg as {
            text: string;
            replyTo?: {
                id: string;
                userId: {
                    name: string,
                    handle: string
                };
            };
        };

        const user = usersBySocketId[socket.id];
        if (!user) return;

        let validatedReplyTo: {
            id: string;
            userId: {
                name: string,
                handle: string
            };
        } | undefined;

        if (
            replyTo &&
            typeof replyTo === "object" &&
            typeof replyTo.id === "string" &&
            typeof replyTo.userId === "object"
        ) {
            validatedReplyTo = {
                id: replyTo.id,
                userId: replyTo.userId,
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

            if (safeImages.length > 0) {
                const remaining = CFG.MAX_DAILY_IMAGES_PER_IP - user.imagesToday;
                if (remaining <= 0) {
                    validatedImages = undefined;
                    socket.emit("image-limit");
                } else {
                    const allowed = safeImages.slice(0, remaining);
                    user.imagesToday += allowed.length;
                    validatedImages = allowed;
                }
            }
        }

        if (text.length > CFG.MAX_MESSAGE_LENGTH) return;

        // Check if user has reached the daily cap of messages sent
        if (user.messagesToday >= CFG.MAX_DAILY_MESSAGES_PER_IP) {
            const ip = socket._ip!;
            if (ipCache[ip]) ipCache[ip].blocked = true;
            socket.emit("kicked", `${SV.USER_MESSAGE_LIMIT}`);
            logger.warn(`User kicked for reaching limit: ${socket.id}`);
            disconnectSocket(socket);
            return;
        }

        const now = Date.now();
        const messageId = crypto.randomUUID();

        // For checking if user is spamming
        user.recentSends = user.recentSends.filter(t => now - t < CFG.SPAM_TIME);   // Remove timestamps older than SPAM_TIME
        user.recentSends.push(now);     // Add current timestamp
        if (user.recentSends.length > CFG.SPAM_THRESHOLD) {
            socket.emit("kicked", `${SV.USER_SPAM_KICK}`);
            logger.warn(`User kicked for spamming: ${socket.id}`);
            disconnectSocket(socket);
            return;
        } else if (user.recentSends.length >= CFG.SPAM_THRESHOLD - 2) {
            socket.emit("warn-kick");
        }

        user.messages.push({    // for delete purposes - store in database later
            id: messageId,
            createdAt: now,
        });

        user.messagesToday++;
        totalMessagesToday++;

        // Send/broadcast message to everyone
        chat.emit("new-message", {
            id: messageId,
            user: { name: user.username, handle: user.userHandle },
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

        chat.emit("delete-message-public", messageId);
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

        chat.emit("add-reaction", {
            messageId,
            emoji,
            user: user.userHandle
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
        chat.emit("edit-message", {
            messageId,
            text,
        });
    });

    socket.on("disconnect", () => {
        onClientDisconnect(socket);
    });

    socket.on("afk-disconnect", () => {
        disconnectSocket(socket);
    });
});

function onClientDisconnect(socket: Socket & { _disconnected?: boolean; _ip?: string }) {
    if (socket._disconnected) return; // already handled
    socket._disconnected = true;
    activeConnections--;
    const ip = socket._ip;
    delete usersBySocketId[socket.id];

    broadcastActiveConnections();
    broadcastUsers();

    if (ip && ipCache[ip]) {
        ipCache[ip].connections = Math.max(0, ipCache[ip].connections - 1);
        if (ipCache[ip].connections === 0 && ipCache[ip].blocked)
            delete ipCache[ip];
    }

    logger.info(`User disconnected: ${socket.id}`)
}

function disconnectSocket(socket: Socket) {
    onClientDisconnect(socket);
    socket.disconnect(true);
}

function broadcastActiveConnections(): void {
    chat.emit("active-connections", activeConnections);
}

function broadcastUsers(): void {
    chat.emit(
        "users-update",
        Object.values(usersBySocketId).map(user => ({
            username: user.username,
            userHandle: user.userHandle,
            userCode: user.userCode,
            joinedAt: user.joinedAt,
            device: user.device,
        }))
    );
}

function scheduleMidnightReset(): void {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
        totalMessagesToday = 0;
        // reset user counters
        for (const socketId in usersBySocketId) {
            usersBySocketId[socketId].messagesToday = 0;
            usersBySocketId[socketId].imagesToday = 0;
        }
        // reset IP blocks
        for (const ip in ipCache) {
            ipCache[ip].blocked = false;
        }

        logger.info("Daily usage counters reset.");
        scheduleMidnightReset();
    }, msUntilMidnight);
}

function hoursUntilReset(): number {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // next midnight
    const msLeft = midnight.getTime() - now.getTime();
    if (msLeft < 60 * 1000) return 0;
    const hours = Math.ceil(msLeft / (1000 * 60 * 60));
    return hours;
}

function generateUserDiscriminator(username: string): string {
    const used = new Set<string>();
    for (const user of Object.values(usersBySocketId)) {
        if (user.username === username) {
            used.add(user.userCode);
        }
    }

    while (true) {
        const id = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, "0");

        if (!used.has(id)) return id;
    }
}

function shutdown(): void {
    server.close(() => {
        process.exit(1);
    });

    // Force exit if close hangs
    setTimeout(() => process.exit(1), 5000);
}

scheduleMidnightReset();

server.listen(CFG.PORT, "0.0.0.0", () => {
    logger.info(`Server listening on port ${CFG.PORT}`);
});
