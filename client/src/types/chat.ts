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

export type DrawerAction = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
};

export type DOMEvent = {
  onClick?: (ev: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart?: (ev: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd?: (ev: React.TouchEvent<HTMLDivElement>) => void;
  onLongPress?: () => void;
};
