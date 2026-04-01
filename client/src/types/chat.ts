export interface MessageMeta {
    id: string;
    user: UserIdentity;
    textKey: string;
    timestamp: number;
    edited?: boolean;
    system?: boolean;
    replyTo?: ReplyData
    reactions?: MessageReactionData[];
    images?: MediaMeta[];
};

export interface MessageData {
    id: string;
    user: UserIdentity;
    text: string;
    timestamp: number;
    edited?: boolean;
    system?: boolean;
    replyTo?: ReplyData
    reactions?: MessageReactionData[];
    images?: MediaMeta[];
};

export interface FileData {
    id: number;
    file?: File;
    url?: string;
    progress?: number;
    cancelToken?: CancelToken;
};

export interface ReplyData {
    id: string;
    userId: UserIdentity;
}

export interface UserIdentity {
    name: string;
    handle: string;
}

export interface UserMeta {
    username: string;
    userHandle: string;
    userCode: string;
    joinedAt: number;
    device: string;
};

export interface MediaMeta {
    id: string;
    key: string;
    mime: string;
    size: number;
    url?: string;
};

export interface UploadMeta {
    id: string;
    key: string;
    url: string;
    type: "text" | "image";
}

export interface SendIntentPayload {
    textLength?: number;
    textBytes?: number;
    files?: {
        mime: string;
        size: number;
    }[];
}

export interface SendPayload {
    id: string;
    textKey?: string;
    images?: MediaMeta[];
    replyTo?: ReplyData;
};

export interface UploadAuthorization {
    id: string,
    uploads?: UploadMeta[];
}

export interface SessionUserStatsMeta {
    messageCount: number;
    joinedAt?: number;
    lastActive?: number;
}

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
    onLongPressMessage?: (msg: MessageData) => void;
};

export type MessageActionData =
    | { type: "reply"; userId: UserIdentity; messageId: string }
    | { type: "edit"; messageId: string };

export interface MessageReactionData {
    emoji: string;
    userIds: string[];
};

export interface CancelToken {
    cancelled: boolean;
}

export type MediaValidationResult =
    | { ok: true }
    | { ok: false; reason: number };

export type PasteResult =
    | { type: "image"; url?: string; file?: File }
    | { type: "youtube"; videoId: string; url: string; thumbnail: string }
    | { type: "spotify"; url: string; thumbnail: string; title?: string }
    | { type: "twitter"; url: string; text?: string }
    | { type: "github"; url: string; repo?: string }
    | { type: "media"; error?: number }
    | { type: "content"; error?: string }
    | null;
