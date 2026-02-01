export type MessageMeta = {
  id: string;
  createdAt: number;
};

export type UserMeta = {
  username: string;
  recentSends: number[];
  messages: MessageMeta[];
  joinedAt: number;
  device: string;
};

export type MediaMeta = {
  id: string;
  key: string;
  url: string;
  mime: string;
  size: number;
};
