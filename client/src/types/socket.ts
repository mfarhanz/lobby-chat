import type { MessageData, UserMeta, SendPayload } from "./chat";

export interface ServerToClientEvents {
    "new-message": (msg: MessageData) => void;
    "delete-message-public": (msgId: string) => void;
    "edit-message": (payload: {
        messageId: string;
        text: string;
    }) => void;
    "add-reaction": (payload: {
        messageId: string;
        emoji: string;
        user: string;
    }) => void;
    "active-connections": (count: number) => void;
    "users-update": (users: UserMeta[]) => void;
    "username": (username: string) => void;
    "kicked": (reason?: string) => void;
    "warn-kick": () => void;
    "server-limit": (downtime: number) => void;
    "image-limit": () => void;
}

export interface ClientToServerEvents {
    "send-message": (msg: SendPayload) => void;
    "delete-message": (msgId: string) => void;
    "edit-message": (payload: {
        messageId: string;
        text: string;
    }) => void;
    "add-reaction": (payload: {
        messageId: string;
        emoji: string;
    }) => void;
    "afk-disconnect": () => void;
}
