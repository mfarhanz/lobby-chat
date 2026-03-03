"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPAM_TIME = exports.SPAM_THRESHOLD = exports.MAX_MESSAGE_LENGTH = exports.MAX_DAILY_IMAGES_PER_IP = exports.MAX_DAILY_MESSAGES_PER_IP = exports.MAX_DAILY_MESSAGES = exports.MAX_CONNECTIONS_FROM_IP = exports.MAX_CONNECTIONS = exports.PORT = exports.TURNSTILE_SECRET = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;
exports.PORT = Number(process.env.PORT) || 3000;
exports.MAX_CONNECTIONS = 1000; // max server connection
exports.MAX_CONNECTIONS_FROM_IP = 3; // max connections from one IP address
exports.MAX_DAILY_MESSAGES = 150_000; // max messages server can accept per day
exports.MAX_DAILY_MESSAGES_PER_IP = 2000; // max messages sent from a unique ip
exports.MAX_DAILY_IMAGES_PER_IP = 20;
exports.MAX_MESSAGE_LENGTH = 5000; // max message length (string length, not size)
exports.SPAM_THRESHOLD = 8; // max messages within spam window
exports.SPAM_TIME = 10000; // spam window in milliseconds
