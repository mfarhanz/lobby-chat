export interface ServerToClientEvents {
  "chat-message": (msg: ChatMessage) => void;
  "active-connections": (count: number) => void;
  "users": (users: string[]) => void;
  "kicked": (reason?: string) => void;
}

export interface ClientToServerEvents {
  "chat-message": (msg: string) => void;
}

export type ChatMessage = {
  username: string;
  text: string;
  timestamp: number;
};
