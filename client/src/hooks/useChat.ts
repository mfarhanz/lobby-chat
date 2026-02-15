import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "../types/socket";
import type { MessageData, UserMeta, SendPayload, SessionUserStatsMeta } from "../types/chat";
import { MAX_MESSAGE_REACTIONS } from "../constants/chat";

export function useChat() {
    const [messages, setMessages] = useState<Map<string, MessageData>>(new Map());
    const [messageOrder, setMessageOrder] = useState<string[]>([]);
    const userStats = useRef<Record<string, SessionUserStatsMeta>>({});
    const [userCount, setUserCount] = useState(0);
    const [connected, setConnected] = useState(false);
    const [username, setUsername] = useState<string>("");
    const [users, setUsers] = useState<UserMeta[]>([]);
    const [socket, setSocket] = useState<Socket<
        ServerToClientEvents,
        ClientToServerEvents
    > | null>(null);

    const startChat = useCallback((turnstileToken?: string) => {
        if (socket) return;

        const newSocket = io(
            import.meta.env.VITE_SOCKET_URL + "/chat",
            // {
            //     path: "/socket",
            //     auth: turnstileToken ? { turnstileToken } : {},
            // }
        );

        setSocket(newSocket);
    }, [socket]);

    const sendMessage = useCallback((payload: SendPayload) => {
        const hasText = payload.text.trim().length > 0;
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


    useEffect(() => {
        if (!socket) return;

        const handleSendMessage = (msg: unknown) => {
            if (!msg || typeof msg !== "object") return;

            const { id, user, text, timestamp, images, replyTo } = msg as MessageData;

            if (
                typeof user !== "string" ||
                typeof text !== "string" ||
                typeof timestamp !== "number"
            ) return;

            let validatedReplyTo: MessageData["replyTo"] | undefined;
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

            let validatedImages: MessageData['images'] | undefined;
            if (Array.isArray(images)) {
                validatedImages = images.filter(img =>
                    img &&
                    typeof img === "object" &&
                    typeof img.id === "string" &&
                    typeof img.key === "string" &&
                    typeof img.url === "string" &&
                    typeof img.mime === "string" &&
                    typeof img.size === "number"
                );
                if (validatedImages.length === 0) validatedImages = undefined;
            }

            setMessages(prev => {
                const newMap = new Map(prev);
                newMap.set(id, { id, user, text, timestamp, replyTo: validatedReplyTo, images: validatedImages });
                return newMap;
            });
            setMessageOrder(prev => [...prev, id]);

            // update user's stats in stats map whenever a new message is sent
            const oldStats = userStats.current[user] ?? { messageCount: 0, lastActive: 0 };
            userStats.current[user] = {
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
                    if (!existing.users.includes(user)) {
                        reactions[existingIndex] = { ...existing, users: [...existing.users, user] };
                    } else {
                        const newUsers = existing.users.filter(u => u !== user);
                        if (newUsers.length === 0) {
                            reactions.splice(existingIndex, 1);
                        } else {
                            reactions[existingIndex] = { ...existing, users: newUsers };
                        }
                    }
                } else {
                    if (reactions.length >= MAX_MESSAGE_REACTIONS) return prev;
                    reactions.push({ emoji, users: [user] });
                }

                const newMap = new Map(prev);
                newMap.set(messageId, { ...oldMsg, reactions: reactions });
                return newMap;
            });
        };

        socket.on("connect", () => setConnected(true));
        socket.on("username", setUsername);
        socket.on("new-message", handleSendMessage);
        socket.on("delete-message-public", handleDeleteMessage);
        socket.on("edit-message", handleEditMessage);
        socket.on("add-reaction", handleAddReaction);
        socket.on("active-connections", setUserCount);
        socket.on("users-update", (users) => {
            if (!Array.isArray(users)) return;
            setUsers(users);
        });
        socket.on("kicked", (reason) => {
            alert(reason || "You have been kicked!");
            socket.disconnect();
        });
        socket.on("disconnect", () => {
            setUsers([]);
            setConnected(false);
        });

        return () => {
            socket.off("new-message", handleSendMessage);
            socket.off("delete-message-public", handleDeleteMessage);
            socket.off("active-connections", setUserCount);
            socket.off("users-update");
            socket.off("username");
            socket.off("kicked");
            socket.off("connect");
            socket.off("disconnect");
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
        username,
        messages,
        messageOrder,
        startChat,
        sendMessage,
        editMessage,
        deleteMessage,
        addReaction,
    };
}
