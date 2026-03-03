import dotenv from "dotenv";
dotenv.config();

export const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET as string;
export const PORT = Number(process.env.PORT) || 3000;

export const MAX_CONNECTIONS = 1000;        // max server connection
export const MAX_CONNECTIONS_FROM_IP = 3;  // max connections from one IP address

export const MAX_DAILY_MESSAGES = 150_000;      // max messages server can accept per day
export const MAX_DAILY_MESSAGES_PER_IP = 2000;  // max messages sent from a unique ip
export const MAX_DAILY_IMAGES_PER_IP = 20;

export const MAX_MESSAGE_LENGTH = 5000;     // max message length (string length, not size)

export const SPAM_THRESHOLD = 8; // max messages within spam window
export const SPAM_TIME = 10000; // spam window in milliseconds
