export type SendPayload = {
  text: string;
  images?: MediaMeta[];
  replyTo?: ChatReply;
};

export type ChatMessage = {
    id: string;
    user: string;
    text: string;
    timestamp: number;
    edited?: boolean;
    replyTo?: ChatReply
    reactions?: ChatReaction[];
    images?: MediaMeta[];
};

export type ChatProps = {
    username: string,
    users: string[],
    messages: ChatMessage[];
    connected: boolean;
    activeConnections: number;
    startChat: (token?: string) => void;
    sendMessage: (msg: SendPayload) => void;
    editMessage: (messageId: string, text: string) => void;
    deleteMessage: (msg: string) => void;
    addReaction: (messageId: string, emoji: string) => void;
};


export type UsersPanelProps = {
  users: ChatUser[];
  messages: ChatMessage[];
};

export type ChatFile = {
    file: File;
    url: string;
};

export type ChatReply = {
    id: string;
    user: string;
}

export type ChatAction =
    | { type: "reply"; name: string; messageId: string }
    | { type: "edit"; messageId: string };

export type ChatReaction = {
  emoji: string;
  users: string[];
};

export type ChatUser = {
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

