export type MessageMeta = {
  id: string;
  createdAt: number;
};

export type UserMeta = {
  username: string;
  recentSends: number[];
  messages: MessageMeta[];
};
