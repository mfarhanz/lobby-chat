import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "../types/socket";
import type { ChatMessage, SendPayload } from "../types/chat";

// const MAX_MESSAGE_LENGTH = 5000;

export function useChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeConnections, setActiveConnections] = useState(0);
    const [connected, setConnected] = useState(false);
    const [users, setUsers] = useState<string[]>([]);
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
        if (!payload.text.trim()) return;
        socket?.emit("send-message", payload);
    }

    function deleteMessage(messageId: string) {
        socket?.emit("delete-message", messageId);
    }

    function editMessage(messageId: string, text: string) {
        socket?.emit("edit-message", { messageId, text });
    };

    useEffect(() => {
        if (!socket) return;

        const handleSendMessage = (msg: unknown) => {
            if (
                !msg ||
                typeof msg !== "object" ||
                !("user" in msg) ||
                !("text" in msg) ||
                !("timestamp" in msg)
            ) return;

            const { id, user, text, timestamp, replyTo } = msg as ChatMessage;

            if (
                typeof user !== "string" ||
                typeof text !== "string" ||
                typeof timestamp !== "number"
            ) return;

            let validatedReplyTo: ChatMessage["replyTo"] | undefined;
            if (
                replyTo &&
                typeof replyTo === "object" &&
                "id" in replyTo &&
                "user" in replyTo &&
                typeof replyTo.id === "string" &&
                typeof replyTo.user === "string"
            ) {
                validatedReplyTo = {
                    id: replyTo.id,
                    user: replyTo.user,
                };
            }

            // if (text.length > MAX_MESSAGE_LENGTH) return;

            setMessages((prev) => [...prev, { id, user, text, timestamp, replyTo: validatedReplyTo }]);
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

        socket.on("new-message", handleSendMessage);
        socket.on("delete-message-public", handleDeleteMessage);
        socket.on("edit-message", handleEditMessage);
        socket.on("active-connections", setActiveConnections);
        socket.on("users-update", (usernames) => {
            if (!Array.isArray(usernames)) return;
            setUsers(usernames);
        });
        socket.on("username", setUsername);
        socket.on("kicked", (reason) => {
            alert(reason || "You have been kicked!");
            socket.disconnect();
        });

        socket.on("connect", () => setConnected(true));
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
    };
}
