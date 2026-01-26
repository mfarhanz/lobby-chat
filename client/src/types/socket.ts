import type { ChatMessage, SendPayload } from "./chat";

export interface ServerToClientEvents {
  "new-message": (msg: ChatMessage) => void;
  "delete-message-public": (msgId: string) => void;
  "edit-message": (payload: {
    messageId: string;
    text: string;
  }) => void;
  "active-connections": (count: number) => void;
  "users-update": (users: string[]) => void;
  "username": (username: string) => void;
  "kicked": (reason?: string) => void;
}

export interface ClientToServerEvents {
  "send-message": (msg: SendPayload) => void;
  "delete-message": (msgId: string) => void;
  "edit-message": (payload: {
    messageId: string;
    text: string;
  }) => void;
}
