export type SendPayload = {
  text: string;
  images?: MediaMeta[];
  replyTo?: ReplyData;
};

export type MessageData = {
    id: string;
    user: string;
    text: string;
    timestamp: number;
    edited?: boolean;
    replyTo?: ReplyData
    reactions?: MessageReactionData[];
    images?: MediaMeta[];
};

export type ChatProps = {
    username: string,
    users: string[],
    messages: MessageData[];
    connected: boolean;
    activeConnections: number;
    startChat: (token?: string) => void;
    sendMessage: (msg: SendPayload) => void;
    editMessage: (messageId: string, text: string) => void;
    deleteMessage: (msg: string) => void;
    addReaction: (messageId: string, emoji: string) => void;
};

export type UsersPanelProps = {
  users: UserMeta[];
  messages: MessageData[];
};

export type FileData = {
    file: File;
    url: string;
};

export type ReplyData = {
    id: string;
    user: string;
}

export type MessageActionData =
    | { type: "reply"; name: string; messageId: string }
    | { type: "edit"; messageId: string };

export type MessageReactionData = {
  emoji: string;
  users: string[];
};

export type UserMeta = {
  username: string;
  joinedAt: number;
  device: string;
};

export type MediaValidationResult =
    | { ok: true }
    | { ok: false; reason: number };

export type MediaMeta = {
  id: string;
  key: string;         // object key in bucket
  url: string;
  mime: string;
  size: number;
};

