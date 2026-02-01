import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "../types/socket";
import type { ChatMessage, ChatUser, SendPayload } from "../types/chat";

const MAX_MESSAGE_REACTIONS = 20;

export function useChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeConnections, setActiveConnections] = useState(0);
    const [connected, setConnected] = useState(false);
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [username, setUsername] = useState<string>("");
    const [socket, setSocket] = useState<Socket<
        ServerToClientEvents,
        ClientToServerEvents
    > | null>(null);

    function startChat(turnstileToken?: string) {
        if (socket) return;

        const newSocket = io({ auth: turnstileToken ? { turnstileToken } : {} });
        setSocket(newSocket);
    }

    function sendMessage(payload: SendPayload) {
        const hasText = payload.text.trim().length > 0;
        const hasImages = !!payload.images?.length;
        if (!hasText && !hasImages) return;
        socket?.emit("send-message", payload);
    }

    function deleteMessage(messageId: string) {
        socket?.emit("delete-message", messageId);
    }

    function editMessage(messageId: string, text: string) {
        socket?.emit("edit-message", { messageId, text });
    };

    function addReaction(messageId: string, emoji: string) {
        socket?.emit("add-reaction", { messageId, emoji });
    }

    useEffect(() => {
        if (!socket) return;

        const handleSendMessage = (msg: unknown) => {
            if (!msg || typeof msg !== "object") return;

            const { id, user, text, timestamp, images, replyTo } = msg as ChatMessage;

            if (
                typeof user !== "string" ||
                typeof text !== "string" ||
                typeof timestamp !== "number"
            ) return;

            let validatedReplyTo: ChatMessage["replyTo"] | undefined;
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

            let validatedImages: ChatMessage['images'] | undefined;
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

            setMessages((prev) => [...prev, { id, user, text, timestamp, replyTo: validatedReplyTo, images: validatedImages }]);
        };

        const handleDeleteMessage = (messageId: string) => {
            setMessages(prev => prev.filter(m => m.id !== messageId));
        };

        const handleEditMessage = ({
            messageId,
            text,
        }: {
            messageId: string;
            text: string;
        }) => {
            setMessages(prev =>
                prev.map(m =>
                    m.id === messageId ? { ...m, text, edited: true } : m
                )
            );
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
            setMessages(prev =>
                prev.map(m => {
                    if (m.id !== messageId) return m;

                    const reactions = m.reactions ? [...m.reactions] : [];
                    const existingIndex = reactions.findIndex(r => r.emoji === emoji);

                    if (existingIndex !== -1) {
                        const existing = reactions[existingIndex];

                        if (!existing.users.includes(user)) {
                            reactions[existingIndex] = {
                                ...existing,
                                users: [...existing.users, user],
                            };
                        } else {
                            const newUsers = existing.users.filter(u => u !== user);

                            // remove entire reaction if no users left
                            if (newUsers.length === 0) {
                                reactions.splice(existingIndex, 1);
                            } else {
                                reactions[existingIndex] = {
                                    ...existing,
                                    users: newUsers,
                                };
                            }
                        }
                    } else {
                        if (reactions.length >= MAX_MESSAGE_REACTIONS) return m;
                        reactions.push({ emoji, users: [user] });
                    }

                    return { ...m, reactions };
                })
            );
        };

        socket.on("connect", () => setConnected(true));
        socket.on("username", setUsername);
        socket.on("new-message", handleSendMessage);
        socket.on("delete-message-public", handleDeleteMessage);
        socket.on("edit-message", handleEditMessage);
        socket.on("add-reaction", handleAddReaction);
        socket.on("active-connections", setActiveConnections);
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
            socket.off("active-connections", setActiveConnections);
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
        activeConnections,
        messages,
        users,
        username,
        startChat,
        sendMessage,
        editMessage,
        deleteMessage,
        addReaction,
    };
}
