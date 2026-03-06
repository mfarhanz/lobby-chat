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

export interface MediaMeta {
  id: string;
  key: string;
  url: string;
  mime: string;
  size: number;
};
