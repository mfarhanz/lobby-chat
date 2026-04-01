import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "../types/socket";
import type {
    MessageData, MessageMeta, UserMeta, SendPayload, SessionUserStatsMeta, UserIdentity,
    SendIntentPayload, ReplyData, FileData, UploadAuthorization, UploadMeta, MediaMeta
} from "../types/chat";
import { MAX_MESSAGE_REACTIONS, SEND_MESSAGE_TIMEOUT } from "../constants/chat";
import { LocalMessages } from "../data/localMessages";
import { uploadToS3 } from "../utils/media";

export function useChat() {
    const [messages, setMessages] = useState<Map<string, MessageData>>(new Map());
    const [messageOrder, setMessageOrder] = useState<string[]>([]);
    const userStats = useRef<Record<string, SessionUserStatsMeta>>({});
    const [userCount, setUserCount] = useState(0);
    const [connected, setConnected] = useState(false);
    const [userId, setUserId] = useState<UserIdentity>();
    const [users, setUsers] = useState<UserMeta[]>([]);
    const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

    const pendingTextRef = useRef<string | null>(null);
    const pendingFilesRef = useRef<FileData[] | null>(null);
    const pendingReplyRef = useRef<ReplyData | undefined>(undefined);
    const pendingResolveRef = useRef<(() => void) | undefined>(undefined);

    const CDN = import.meta.env.VITE_CLOUDFRONT_URL;

    const startChat = useCallback((username?: string, turnstileToken?: string) => {
        if (socket) return;

        const newSocket = io(import.meta.env.VITE_SOCKET_URL + "/chat", {
            // path: "/socket",
            auth: { username, turnstileToken: turnstileToken },
            // autoConnect: false
        });

        setSocket(newSocket);
    }, [socket]);

    const sendLocalSystemMessage = useCallback((text: string) => {
        const id = `__local_${crypto.randomUUID()}`;

        setMessages(prev => {
            const newMap = new Map(prev);
            newMap.set(id, {
                id,
                user: { name: "System", handle: "System" },
                text,
                timestamp: Date.now(),
                system: true,
            });
            return newMap;
        });
        setMessageOrder(prev => [...prev, id]);
    }, []);

    const sendIntent = useCallback((
        payload: SendIntentPayload,
        text: string,
        files: FileData[],
        replyTo?: ReplyData,
    ): Promise<void> => {
        return new Promise((resolve) => {
            console.log("users wants to send:", payload);
            const hasText = !!payload.textLength;
            const hasFiles = !!payload.files?.length;
            if (!hasText && !hasFiles) {
                resolve(); // immediately resolve if nothing to send
                return;
            }

            socket?.emit("send-intent", payload);

            const timeout = setTimeout(() => {
                console.warn("sending message timed out");
                pendingResolveRef.current?.();
                pendingResolveRef.current = undefined;
            }, SEND_MESSAGE_TIMEOUT);

            // store temp refs for use when server approves send
            pendingTextRef.current = text;
            pendingFilesRef.current = files;
            pendingReplyRef.current = replyTo;
            pendingResolveRef.current = () => {
                clearTimeout(timeout);   // cancel the timeout if it hasn’t fired yet
                resolve?.();      // then call the real resolve
                pendingResolveRef.current = undefined
            };
        });
    }, [socket]);

    const sendMessage = useCallback((payload: SendPayload) => {
        console.log("user approved to send:", payload);
        if (!payload?.id) return;
        const hasText = typeof payload.textKey === "string";
        const hasImages = !!payload.images?.length;
        if (!hasText && !hasImages) return;

        socket?.emit("send-message", payload);
    }, [socket]);

    const deleteMessage = useCallback((messageId: string) => {
        socket?.emit("delete-message", messageId);
    }, [socket]);

    const editMessage = useCallback((messageId: string, text: string) => {
        socket?.emit("edit-message", { messageId, text });
    }, [socket]);

    const addReaction = useCallback((messageId: string, emoji: string) => {
        socket?.emit("add-reaction", { messageId, emoji });
    }, [socket]);

    const disconnectInactive = useCallback(() => {
        socket?.emit("afk-disconnect");
    }, [socket]);

    useEffect(() => {
        if (!socket) return;
        // socket.connect();    // no need to manual connect

        const handleSendMessage = async (response: unknown) => {
            const t3 = performance.now();
            if (!response || typeof response !== "object") return;
            console.log("server responded:", response);

            const { id, uploads } = response as UploadAuthorization;

            if (typeof id !== "string" || !Array.isArray(uploads)) return;

            const text = pendingTextRef.current ?? "";
            const files = pendingFilesRef.current ?? [];
            const replyTo = pendingReplyRef.current;

            if (!text && files.length === 0) return;
            else {
                const validatedUploads: UploadMeta[] = uploads.filter(u =>
                    u &&
                    typeof u === "object" &&
                    typeof u.id === "string" &&
                    typeof u.key === "string" &&
                    typeof u.url === "string" &&
                    (u.type === "text" || u.type === "image")
                );

                if (validatedUploads.length === 0) return;
                const textUpload = validatedUploads.find(u => u.type === "text");
                const imageUploads = validatedUploads.filter(u => u.type === "image");

                let textKey: string | undefined;
                if (text && textUpload) {
                    const textBlob = new Blob(
                        [JSON.stringify({ text })],
                        { type: "application/json" }
                    );
                    const res = await uploadToS3(textBlob, textUpload);
                    if (res) textKey = textUpload.key;
                    else console.error(`Failed to upload text: ${textUpload.key}`);
                }

                let uploadedImages: MediaMeta[] | undefined;
                if (files.length && imageUploads.length) {
                    const validFiles = files.filter((f): f is FileData & { file: File } => !!f.file);
                    const results = await Promise.all(
                        validFiles.map(async (file, idx) => {
                            const uploadMeta = imageUploads[idx];
                            if (!uploadMeta) return null;

                            const success = await uploadToS3(file.file, uploadMeta);
                            if (!success) {
                                console.error(`Failed to upload file: ${uploadMeta.key}`);
                                return null;
                            }

                            return {
                                id: uploadMeta.id,
                                key: uploadMeta.key,
                                mime: file.file.type,
                                size: file.file.size,
                            } as MediaMeta;
                        })
                    );
                    // filter out any nulls
                    uploadedImages = results.filter(Boolean) as MediaMeta[];
                    if (uploadedImages.length === 0) uploadedImages = undefined;
                }

                const payload: SendPayload = {
                    id,
                    ...(textKey ? { textKey } : {}),
                    ...(uploadedImages ? { images: uploadedImages } : {}),
                    ...(replyTo ? { replyTo } : {})
                };

                sendMessage(payload);
            }

            pendingResolveRef.current?.();

            pendingTextRef.current = null;
            pendingFilesRef.current = [];
            pendingReplyRef.current = undefined;
            pendingResolveRef.current = undefined;

            const t4 = performance.now();
            console.log(`processing upload auth from server took: ${t4-t3}ms`);
        };

        const handleNewMessage = async (msg: unknown) => {
            const t3 = performance.now();
            if (!msg || typeof msg !== "object") return;

            console.log("server broadcasted to all:", msg);

            const { id, user, textKey, timestamp, images, replyTo } = msg as MessageMeta;

            if (
                typeof id !== "string" ||
                typeof user !== "object" ||
                typeof timestamp !== "number"
            ) return;

            let text = "";
            if (typeof textKey === "string") {
                try {
                    const res = await fetch(`${CDN}/${textKey}`);   // get user text message from s3 bucket
                    if (res.ok) {
                        const data = await res.json();
                        if (typeof data?.text === "string") {
                            text = data.text;
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            let validatedReplyTo: MessageMeta["replyTo"] | undefined;
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

            let validatedImages: MessageMeta['images'] | undefined;
            if (Array.isArray(images)) {
                validatedImages = images.filter(img =>
                    img &&
                    typeof img === "object" &&
                    typeof img.id === "string" &&
                    typeof img.key === "string" &&
                    typeof img.mime === "string" &&
                    typeof img.size === "number"
                ).map(img => ({
                    ...img,
                    url: `${CDN}/${img.key}`,
                }));
                if (validatedImages.length === 0) validatedImages = undefined;
            }

            setMessages(prev => {
                const newMap = new Map(prev);
                newMap.set(id, {
                    id,
                    user,
                    text,
                    timestamp,
                    replyTo: validatedReplyTo,
                    images: validatedImages
                });
                return newMap;
            });
            setMessageOrder(prev => [...prev, id]);

            const t2 = performance.now();
            console.log("end: ", t2);

            console.log(`broadcasting to all took: ${t2-t3}ms`);

            // update user's stats in stats map whenever a new message is sent
            const oldStats = userStats.current[user.handle] ?? {
                messageCount: 0,
                lastActive: 0
            };
            userStats.current[user.handle] = {
                messageCount: oldStats.messageCount + 1,
                lastActive: timestamp,
            };
        };

        const handleDeleteMessage = (messageId: string) => {
            setMessages(prev => {
                const newMap = new Map(prev);
                newMap.delete(messageId);
                return newMap;
            });
            setMessageOrder(prev => prev.filter(msgId => msgId !== messageId));
        };

        const handleEditMessage = ({
            messageId,
            text,
        }: {
            messageId: string;
            text: string;
        }) => {
            setMessages(prev => {
                const oldMsg = prev.get(messageId);
                if (!oldMsg) return prev; // message doesn’t exist

                const newMap = new Map(prev);
                newMap.set(messageId, { ...oldMsg, text: text, edited: true });
                return newMap;
            });
        };

        const handleAddReaction = ({
            messageId,
            emoji,
            user
        }: {
            messageId: string;
            emoji: string;
            user: string

        }) => {
            setMessages(prev => {
                const oldMsg = prev.get(messageId);
                if (!oldMsg) return prev;

                const reactions = oldMsg.reactions ? [...oldMsg.reactions] : [];
                const existingIndex = reactions.findIndex(r => r.emoji === emoji);

                if (existingIndex !== -1) {
                    const existing = reactions[existingIndex];
                    if (!existing.userIds.includes(user)) {
                        reactions[existingIndex] = { ...existing, userIds: [...existing.userIds, user] };
                    } else {
                        const newUsers = existing.userIds.filter(u => u !== user);
                        if (newUsers.length === 0) {
                            reactions.splice(existingIndex, 1);
                        } else {
                            reactions[existingIndex] = { ...existing, userIds: newUsers };
                        }
                    }
                } else {
                    if (reactions.length >= MAX_MESSAGE_REACTIONS) return prev;
                    reactions.push({ emoji, userIds: [user] });
                }

                const newMap = new Map(prev);
                newMap.set(messageId, { ...oldMsg, reactions: reactions });
                return newMap;
            });
        };

        socket.on("connect", () => setConnected(true));
        socket.on("user-confirm", (user) => {
            setUserId(user);
            sendLocalSystemMessage(LocalMessages.welcome(user.name));
        });
        socket.on("send-approval", handleSendMessage);
        socket.on("new-message", handleNewMessage);
        socket.on("delete-message-public", handleDeleteMessage);
        socket.on("edit-message", handleEditMessage);
        socket.on("add-reaction", handleAddReaction);
        socket.on("active-connections", setUserCount);
        socket.on("users-update", (users) => {
            if (!Array.isArray(users)) return;
            setUsers(users);
        });
        socket.on("server-limit", (downtime) => {
            sendLocalSystemMessage(LocalMessages.server_limit(downtime));
        });
        socket.on("image-limit", () => {
            sendLocalSystemMessage(LocalMessages.image_limit());
        });
        socket.on("server-image-limit", () => {
            sendLocalSystemMessage(LocalMessages.server_image_limit());
        });
        socket.on("kicked", (reason) => {
            sendLocalSystemMessage(LocalMessages.kicked(reason ?? null));
        });
        socket.on("warn-kick", () => {
            sendLocalSystemMessage(LocalMessages.kick_warning());
        });
        socket.on("disconnect", () => {
            sendLocalSystemMessage(LocalMessages.disconnected());
            setUsers([]);
            setConnected(false);
        });
        socket.on("connect_error", (err) => {
            sendLocalSystemMessage(LocalMessages.connection_error(err.message));
            console.error("Connection failed: ", err.message);
        });

        return () => {
            socket.off("send-approval", handleSendMessage);
            socket.off("new-message", handleNewMessage);
            socket.off("delete-message-public", handleDeleteMessage);
            socket.off("active-connections", setUserCount);
            socket.off("users-update");
            socket.off("user-confirm");
            socket.off("image-limit");
            socket.off("server-limit");
            socket.off("server-image-limit");
            socket.off("kicked");
            socket.off("warn-kick");
            socket.off("connect");
            socket.off("disconnect");
            socket.off("connect_error");
        };
    }, [socket]);

    useEffect(() => {
        return () => {
            socket?.disconnect();
        };
    }, [socket]);

    return {
        connected,
        userCount,
        userStats,
        users,
        userId,
        messages,
        messageOrder,
        startChat,
        sendIntent,
        editMessage,
        deleteMessage,
        addReaction,
        sendLocalSystemMessage,
        disconnectInactive,
    };
}
