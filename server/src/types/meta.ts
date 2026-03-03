export type UserMeta = {
  username: string;
  messages: MessageMeta[];
  joinedAt: number;
  messagesToday: number;
  imagesToday: number;
  recentSends: number[];
  device: string;
};

export type IpMeta = {
    connections: number;
    blocked: boolean;
};

export type MessageMeta = {
  id: string;
  createdAt: number;
};

export type MediaMeta = {
  id: string;
  key: string;
  url: string;
  mime: string;
  size: number;
};
