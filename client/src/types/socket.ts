import type { MessageData, UserMeta, UserIdentity, SendPayload, SendIntentPayload, UploadAuthorization } from "./chat";

export interface ServerToClientEvents {
    "send-approval": (data: UploadAuthorization) => void;
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
    "user-confirm": (user: UserIdentity) => void;
    "kicked": (reason?: string) => void;
    "warn-kick": () => void;
    "server-limit": (downtime: number) => void;
    "server-image-limit": () => void;
    "image-limit": () => void;
}

export interface ClientToServerEvents {
    "send-intent": (payload: SendIntentPayload) => void;
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
