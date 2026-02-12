export interface MessageData {
    id: string;
    user: string;
    text: string;
    timestamp: number;
    edited?: boolean;
    replyTo?: ReplyData
    reactions?: MessageReactionData[];
    images?: MediaMeta[];
};

export interface FileData {
    file: File;
    url: string;
};

export interface ReplyData {
    id: string;
    user: string;
}

export interface UserMeta {
    username: string;
    joinedAt: number;
    device: string;
};

export interface MediaMeta {
    id: string;
    key: string;         // object key in bucket
    url: string;
    mime: string;
    size: number;
};

export interface SendPayload {
    text: string;
    images?: MediaMeta[];
    replyTo?: ReplyData;
};

export interface DrawerAction {
    key: string;
    label: string;
    icon?: React.ReactNode;
    onPress: () => void;
    destructive?: boolean;
};

export interface DOMEvent {
    onClick?: (ev: React.MouseEvent<HTMLDivElement>) => void;
    onTouchStart?: (ev: React.TouchEvent<HTMLDivElement>) => void;
    onTouchEnd?: (ev: React.TouchEvent<HTMLDivElement>) => void;
    onLongPress?: () => void;
};

export type MessageActionData =
    | { type: "reply"; name: string; messageId: string }
    | { type: "edit"; messageId: string };

export interface MessageReactionData {
    emoji: string;
    users: string[];
};

export type MediaValidationResult =
    | { ok: true }
    | { ok: false; reason: number };

export type PasteResult =
    | { type: "image"; url: string; file?: File }
    | { type: "youtube"; videoId: string; url: string; thumbnail: string }
    | { type: "spotify"; url: string; thumbnail: string; title?: string }
    | { type: "twitter"; url: string; text?: string }
    | { type: "github"; url: string; repo?: string }
    | { type: "media"; error?: number }
    | { type: "content"; error?: string }
    | null;
