export type SendPayload = {
  text: string;
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
};

export type ChatProps = {
    username: string,
    messages: ChatMessage[];
    connected: boolean;
    activeConnections: number;
    startChat: (token?: string) => void;
    sendMessage: (msg: SendPayload) => void;
    editMessage: (messageId: string, text: string) => void;
    deleteMessage: (msg: string) => void;
    addReaction: (messageId: string, emoji: string) => void;
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

export type MediaValidationResult =
    | { ok: true }
    | { ok: false; reason: number };
