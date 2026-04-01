import dotenv from "dotenv";
dotenv.config();

export const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET as string;
export const PORT = Number(process.env.PORT) || 3000;

export const CLIENT_DEPLOYMENT_URL = process.env.CLIENT_DEPLOYMENT_URL!;
export const CLIENT_ALT_DEPLOYMENT_URL = process.env.CLIENT_ALT_DEPLOYMENT_URL!;

export const MAX_CONNECTIONS = 200;        // max server connections at any moment
export const MAX_CONNECTIONS_FROM_IP = 3;  // max connections from one IP address

export const MAX_DAILY_MESSAGES = 90_000;      // max messages server can accept per day
export const MAX_DAILY_IMAGES = 2000;           // max images server can accept per day
export const MAX_DAILY_MESSAGES_PER_IP = 2000;  // max messages sent from a unique ip per day
export const MAX_DAILY_IMAGES_PER_IP = 20;      // max images sent from a unique ip per day

export const MAX_MESSAGE_LENGTH = 5000;     // max message length (string length)
export const MAX_MESSAGE_SIZE = 5000;     // max message size (in bytes)
export const MAX_FILE_SIZE = 300_000;    // max allowed size in bytes for file uploads

export const SPAM_THRESHOLD = 8; // max messages within spam window
export const SPAM_TIME = 10000; // spam window in milliseconds

export const UPLOAD_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif", "image/x-icon"];

// remember to adjust accordingly!
export const AWS_REGION = process.env.AWS_REGION || "us-east-2";
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
export const S3_BUCKET = process.env.S3_BUCKET || "live-chat-storage";
