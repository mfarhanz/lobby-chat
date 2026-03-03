"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_MESSAGES = void 0;
exports.SERVER_MESSAGES = {
    CF_ERROR: "Internal Cloudflare error",
    CF_MISSING: "Turnstile token missing",
    CF_FAILED: "Turnstile validation failed",
    CF_EXPIRED: "Turnstile token expired or already used",
    CF_INVALID: "Invalid Turnstile token",
    CF_BAD_REQUEST: "Bad Turnstile request",
    SERVER_FULL: "Chat lobby is currently full!",
    SERVER_ERROR: "Internal Server Error",
    CLIENT_RELOAD: "Please reload and try again.",
    CLIENT_RELOAD_LATER: "Please reload and retry again in a bit.",
    CLIENT_DISMISS: "Please try again later.",
    CLIENT_UNEXPECTED: "Uh-oh, something went wrong.",
    USER_MESSAGE_LIMIT: "You have reached the daily messaging limit!",
    USER_IP_LIMIT: "Server received too many connections from this IP, further connections are blocked.",
    USER_SPAM_KICK: "You have been kicked for spamming!",
    USER_SPAM_WARNING: "You're sending messages too quickly! Please wait a moment before sending another message to avoid being kicked.",
};
