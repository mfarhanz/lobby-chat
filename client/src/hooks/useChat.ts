import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ChatMessage,
} from "../types/socket";

const MAX_MESSAGE_LENGTH = 5000;

export function useChat() {
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConnections, setActiveConnections] = useState(0);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<string[]>([]);

  function startChat(turnstileToken?: string) {
    if (socketRef.current) return;

    const socket = io({
      auth: turnstileToken ? { turnstileToken } : {},
    });

    socketRef.current = socket;

    socket.on("chat-message", (msg) => {
      if (
        !msg ||
        typeof msg !== "object" ||
        !("username" in msg) ||
        !("text" in msg) ||
        !("timestamp" in msg)
      ) return;

      const { username, text, timestamp } = msg as ChatMessage;

      if (
        typeof username !== "string" ||
        typeof text !== "string" ||
        typeof timestamp !== "number"
      ) return;

      if (text.length > MAX_MESSAGE_LENGTH) return;

      setMessages((prev) => [...prev, { username, text, timestamp }]);
    });

    socket.on("active-connections", (count) => {
      setActiveConnections(count);
    });

    socket.on("users-update", (usernames) => {
      if (!Array.isArray(usernames)) return;
      setUsers(usernames);
    });

    socket.on("kicked", (reason) => {
      alert(reason || "You have been kicked!");
      socket.disconnect();
    });

    socket.on("disconnect", () => {
      setUsers([]);
      setConnected(false);
      socketRef.current = null;
    });

    socket.on("connect", () => {
      setConnected(true);
    });
  }

  function sendMessage(text: string) {
    if (!text.trim()) return;
    socketRef.current?.emit("chat-message", text);
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return {
    messages,
    activeConnections,
    connected,
    users,
    startChat,
    sendMessage,
  };
}
