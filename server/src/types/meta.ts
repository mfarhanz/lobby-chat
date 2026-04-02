export interface UserMeta {
    username: string;
    userHandle: string;
    userCode: string;       // discriminator for users with the same name
    messages: MessageMeta[];
    joinedAt: number;
    messagesToday: number;
    imagesToday: number;
    recentSends: number[];
    device: string;
};

export interface IpMeta {
    connections: number;
    blocked: boolean;
};

export interface MessageMeta {
    id: string;
    createdAt: number;
};

// primary key structure in DB
export interface MessageKey {
    socketId: string;
    messageId: string;
}

export interface MediaMeta {
    id: string;
    key: string;
    mime: string;
    size: number;
};

export interface UploadMeta {
    id: string;
    key: string;
    url: string;
    type: "text" | "image";
}

export interface ReplyMeta {
    id: string;
    userId: {
        name: string;
        handle: string;
    };
}
