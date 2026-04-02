"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DYNAMODB_TTL_SECONDS = exports.DYNAMODB_GSI = exports.DYNAMODB_TABLE = exports.S3_BUCKET = exports.AWS_SECRET_ACCESS_KEY = exports.AWS_ACCESS_KEY_ID = exports.AWS_REGION = exports.UPLOAD_ALLOWED_MIME = exports.SPAM_TIME = exports.SPAM_THRESHOLD = exports.MAX_FILE_SIZE = exports.MAX_MESSAGE_SIZE = exports.MAX_MESSAGE_LENGTH = exports.MAX_DAILY_IMAGES_PER_IP = exports.MAX_DAILY_MESSAGES_PER_IP = exports.MAX_DAILY_IMAGES = exports.MAX_DAILY_MESSAGES = exports.MAX_CONNECTIONS_FROM_IP = exports.MAX_CONNECTIONS = exports.CLIENT_ALT_DEPLOYMENT_URL = exports.CLIENT_DEPLOYMENT_URL = exports.PORT = exports.TURNSTILE_SECRET = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;
exports.PORT = Number(process.env.PORT) || 3000;
exports.CLIENT_DEPLOYMENT_URL = process.env.CLIENT_DEPLOYMENT_URL;
exports.CLIENT_ALT_DEPLOYMENT_URL = process.env.CLIENT_ALT_DEPLOYMENT_URL;
exports.MAX_CONNECTIONS = 200; // max server connections at any moment
exports.MAX_CONNECTIONS_FROM_IP = 3; // max connections from one IP address
exports.MAX_DAILY_MESSAGES = 90_000; // max messages server can accept per day
exports.MAX_DAILY_IMAGES = 2000; // max images server can accept per day
exports.MAX_DAILY_MESSAGES_PER_IP = 2000; // max messages sent from a unique ip per day
exports.MAX_DAILY_IMAGES_PER_IP = 20; // max images sent from a unique ip per day
exports.MAX_MESSAGE_LENGTH = 5000; // max message length (string length)
exports.MAX_MESSAGE_SIZE = 5000; // max message size (in bytes)
exports.MAX_FILE_SIZE = 300_000; // max allowed size in bytes for file uploads
exports.SPAM_THRESHOLD = 8; // max messages within spam window
exports.SPAM_TIME = 10000; // spam window in milliseconds
exports.UPLOAD_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif", "image/x-icon"];
// remember to adjust accordingly! optional blanks left on purpose.
exports.AWS_REGION = process.env.AWS_REGION || "";
exports.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
exports.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
exports.S3_BUCKET = process.env.S3_BUCKET || "";
exports.DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || "";
exports.DYNAMODB_GSI = process.env.DYNAMODB_GSI || "";
exports.DYNAMODB_TTL_SECONDS = 7 * 24 * 60 * 60;
