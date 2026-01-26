import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Thumbnail } from "./Thumbnail";
import { EmojiIcon } from "./icons/EmojiIcon";
import { GifIcon } from "./icons/GifIcon";
import { ImageIcon } from "./icons/ImageIcon";
import { CopyIcon } from "./icons/CopyIcon";
import { ReplyIcon } from "./icons/ReplyIcon";
import { TrashIcon } from "./icons/TrashIcon";
import { ReactionIcon } from "./icons/ReactionIcon";
import { EditIcon } from "./icons/EditIcon";
import ChatActionBar from "./ChatActionBar";
import type { ChatAction, ChatProps, ChatFile, MediaValidationResult, SendPayload } from "../types/chat";
import { CheckIcon } from "./icons/CheckIcon";

export function Chat({
    username,
    messages,
    connected,
    activeConnections,
    startChat,
    sendMessage,
    editMessage,
    deleteMessage,
}: ChatProps) {
    const [input, setInput] = useState("");
    const [now, setNow] = useState(new Date());

    const [embed, setEmbed] = useState<string | null>(null);
    const [embedError, setEmbedError] = useState<string | null>(null);
    const [showEmbedPopup, setShowEmbedPopup] = useState(false);

    const [upload, setUploads] = useState<ChatFile[]>([]);
    const uploadsRef = useRef<ChatFile[]>([]);

    const [action, setAction] = useState<ChatAction | null>(null);
    const [copyId, setCopydId] = useState<string | null>(null);
    const copyTimeoutRef = useRef<number | null>(null);

    const messagesRef = useRef<HTMLDivElement | null>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const turnstileRendered = useRef(false);
    const isAtBottom = useRef(true);

    useEffect(() => {
        if (turnstileRendered.current) return;
        turnstileRendered.current = true;

        // @ts-expect-error injected by CF script
        window.turnstile.render("#turnstile-container", {
            sitekey: "0x4AAAAAACJ_0HK2dEtgp0S_",
            size: "normal",
            theme: "light",
            callback: (token: string) => {
                setTimeout(() => {
                    document.getElementById("turnstile-overlay")?.remove();
                }, 1000);

                startChat(token);
            },
            "error-callback": (err: unknown) => {
                console.error("Turnstile error:", err);
            },
        });
    }, [startChat]);

    useEffect(() => {
        const now = new Date();

        const nextMidnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0, 0, 0, 0
        );

        const timeout = setTimeout(() => {
            setNow(new Date()); // flip Today ↔ Yesterday

            const interval = setInterval(() => {
                setNow(new Date());
            }, 24 * 60 * 60 * 1000);

            return () => clearInterval(interval);
        }, nextMidnight.getTime() - now.getTime());

        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        const el = messagesRef.current;
        if (!el) return;

        const lastMessage = messages[messages.length - 1];

        // 1. If already at bottom -> always scroll
        // 2. If scrolled up -> scroll only if the last message is from the client
        if (isAtBottom.current || lastMessage?.user === username) {
            el.scrollTo({
                top: el.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages, username]);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        uploadsRef.current = upload;
    }, [upload]);

    useEffect(() => {
        return () => {
            uploadsRef.current.forEach(({ url }) =>
                URL.revokeObjectURL(url)
            );
        };
    }, []);

    const handleSend = () => {
        // if popup is still open, block sending
        if (showEmbedPopup) {
            setEmbedError("Please click Embed to validate the media before sending.");
            return;
        }

        // if no text and either no embed or embedError exists, block sending
        if (!input.trim() && (!embed || embedError)) return;

        let sendText = input;
        if (embed) {
            sendText += `\n\n![](${embed})`;
        }

        if (action?.type === "edit" && action.messageId) {
            editMessage(action.messageId, sendText);
        }
        else {
            // if replying to someone, pass in the reply object so ChatMessage can be constructed accordingly later
            const payload: SendPayload = {
                text: sendText,
                ...(action?.type === "reply" && {
                    replyTo: {
                        id: action.messageId,
                        user: action.name,
                    },
                }),
            };

            sendMessage(payload);
        }

        // reset
        setInput("");
        setEmbed(null);
        setAction(null);
        // reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }

    const handleEmbed = async () => {
        if (!embed) {
            setEmbedError("Please enter a link.");
            return;
        }

        const result = await validateMediaUrl(embed);

        if (!result.ok) {
            switch (result.reason) {
                case 1:
                    setEmbedError("Invalid image/GIF link. Please try another URL.");
                    break;
                case 2:
                    setEmbedError("Image/GIF is too large.");
                    break;
                default:
                    break;
            }
            return;
        }

        setEmbed(embed);
        setShowEmbedPopup(false);
        setEmbedError(null);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;

        const newPreviews = files.map(file => ({
            file,
            url: URL.createObjectURL(file),
        }));

        setUploads(prev => {
            const combined = [...prev, ...newPreviews];
            return combined.slice(0, 4);
        });

        e.target.value = "";
    };

    function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const el = e.target;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    }

    function formatTimestamp(ts: number, now: Date) {
        const date = new Date(ts);

        const isSameDay = (a: Date, b: Date) =>
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);

        const time = date.toLocaleString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        if (isSameDay(date, now)) {
            return `Today at ${time}`;
        }

        if (isSameDay(date, yesterday)) {
            return `Yesterday at ${time}`;
        }

        const fullDate = date.toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
        });

        return `${fullDate} ${time}`;
    }

    const checkIfAtBottom = (el: HTMLDivElement) => {
        return el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    };

    const handleScroll = () => {
        const el = messagesRef.current;
        if (!el) return;
        isAtBottom.current = checkIfAtBottom(el);
    };

    const validateMediaUrl = (url: string): Promise<MediaValidationResult> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const oversized = img.naturalWidth > 8000 || img.naturalHeight > 8000;
                if (oversized) {
                    resolve({ ok: false, reason: 2 });
                } else {
                    resolve({ ok: true });
                }
            };
            img.onerror = () => resolve({ ok: false, reason: 1 });
            img.src = url;
        });
    };

    return (
        <section className="chat-panel">
            {/* Messages */}
            <div
                ref={messagesRef}
                className="chat-messages scrollbar-custom"
                onScroll={handleScroll}
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        ref={(el) => {
                            messageRefs.current[msg.id] = el;
                        }}
                        className={`chat-message text-message relative 
                                    ${msg.user === username ? "chat-message-self" : ""}
                                    ${msg.replyTo?.user === username ? "chat-message-ping" : ""}
                                    `}
                    >
                        {/* Reply indicator */}
                        {msg.replyTo && (
                            <div className="reply-wrapper">
                                <div
                                    className="reply-indicator cursor-pointer"
                                    onClick={() => {
                                        const originalEl = messageRefs.current[msg.replyTo!.id];
                                        if (originalEl) {
                                            originalEl.scrollIntoView({ behavior: "smooth", block: "center" });
                                        }
                                    }}
                                >
                                    {(() => {
                                        const original = messages.find(m => m.id === msg.replyTo!.id);

                                        if (!original) {
                                            return <span className="italic ml-1">message deleted</span>;
                                        }

                                        return (
                                            <>
                                                <span className="text-mention-xs">{msg.replyTo.user}</span>
                                                {original.text.length > 75
                                                    ? original.text.slice(0, 75) + " ..."
                                                    : original.text}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Hover actions */}
                        <div className="chat-message-actions">
                            <button
                                className="floating-action-btn"
                                title="Add reaction"
                                onClick={() => { }}
                            >
                                <ReactionIcon className="size-4" />
                            </button>

                            {msg.user === username && (
                                <button
                                    className="floating-action-btn"
                                    title="Edit"
                                    onClick={() => {
                                        setAction({
                                            type: "edit",
                                            messageId: msg.id,
                                        });
                                        setInput(msg.text);
                                        textareaRef.current?.focus();
                                    }}
                                >
                                    <EditIcon className="size-4" />
                                </button>
                            )}

                            <button
                                className="floating-action-btn"
                                title="Copy"
                                onClick={() => {
                                    navigator.clipboard.writeText(msg.text);
                                    setCopydId(msg.id);
                                    if (copyTimeoutRef.current) {
                                        clearTimeout(copyTimeoutRef.current);
                                    }
                                    copyTimeoutRef.current = window.setTimeout(() => {
                                        setCopydId(null);
                                    }, 2000);
                                }}
                            >
                                {copyId === msg.id ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                            </button>

                            {msg.user === username && (
                                <button
                                    className="floating-action-btn"
                                    title="Delete"
                                    onClick={() => msg.id && deleteMessage(msg.id)}
                                >
                                    <TrashIcon className="size-4" />
                                </button>
                            )}

                            <button
                                className="floating-action-btn"
                                title="Reply"
                                onClick={() => {
                                    setAction({
                                        type: "reply",
                                        name: msg.user,
                                        messageId: msg.id,
                                    });
                                    textareaRef.current?.focus();
                                }}
                            >
                                <ReplyIcon className="size-4" />
                            </button>
                        </div>

                        {/* Message header row */}
                        <div className="chat-message-header">
                            <span className="chat-message-username">{msg.user}</span>
                            <span className="chat-message-time">
                                {formatTimestamp(msg.timestamp, now)}
                            </span>
                        </div>

                        {/* Chat message content */}
                        <div className="chat-message-text-wrapper">
                            <div className="chat-message-text">
                                <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>

                            {msg.edited && (
                                <span className="chat-message-edited">(edited)</span>
                            )}
                        </div>

                    </div>
                ))}
            </div>

            {/* Input row */}
            <div className="chat-input-row">
                <div className="chat-input-wrapper">

                    {(embed || upload.length > 0) && (
                        <div
                            className="absolute bottom-full left-2 -mb-px flex items-baseline gap-2 py-0.5"
                        >
                            {embed && !embedError && (
                                <Thumbnail
                                    src={embed}
                                    onRemove={() => setEmbed(null)}
                                />
                            )}

                            {upload.map(({ url }, index) => (
                                <Thumbnail
                                    key={url}
                                    src={url}
                                    onRemove={() => {
                                        URL.revokeObjectURL(url);
                                        setUploads(prev => prev.filter((_, i) => i !== index));
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {action && (
                        <ChatActionBar
                            type={action.type}
                            name={action.type === "reply" ? action.name : undefined}
                            onClose={() => setAction(null)}
                        />
                    )}

                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        value={input}
                        disabled={!connected}
                        placeholder="Type a message..."
                        rows={1}
                        onChange={(e) => {
                            setInput(e.target.value);
                            autoResize(e);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />

                    {showEmbedPopup && (
                        <div
                            className="absolute bottom-full mb-2 right-0 w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg z-20"
                            onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                    setEmbed(null);
                                    setShowEmbedPopup(false);
                                    setEmbedError(null);
                                }
                            }}
                        >
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Enter an image or GIF link..."
                                    className="w-full rounded-md bg-zinc-700 px-3 py-1.5 text-sm outline-none"
                                    onChange={(e) => setEmbed(e.target.value)}
                                />

                                {embedError && (
                                    <div className="text-xs text-red-400">
                                        {embedError}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        className="text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer"
                                        onClick={() => {
                                            setEmbed(null);
                                            setShowEmbedPopup(false);
                                            setEmbedError(null);
                                        }}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        className="text-sm px-3 py-1 rounded-md bg-indigo-600 text-white cursor-pointer"
                                        onClick={handleEmbed}
                                    >
                                        Embed
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                    />

                    <div className="chat-input-btn-group">
                        <button
                            type="button"
                            className="chat-input-btn"
                            title="Emojis"
                            onClick={() => console.log("emoji")}
                        >
                            <EmojiIcon />
                        </button>
                        <button
                            type="button"
                            className={`chat-input-btn ${embed ? "opacity-50 cursor-not-allowed" : ""}`}
                            title="Attach Media"
                            disabled={!!embed}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImageIcon />
                        </button>
                        <button
                            type="button"
                            className={`chat-input-btn ${embed || upload.length > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                            title="Embed GIF/Image"
                            disabled={!!embed || upload.length > 0}
                            onClick={() => setShowEmbedPopup(true)}
                        >
                            <GifIcon />
                        </button>
                    </div>
                </div>

                <button
                    className="chat-send"
                    disabled={!connected}
                    onClick={handleSend}
                >
                    ➤
                </button>
            </div>

            {/* Status */}
            <div className="mt-3">
                <div className="relative inline-block group">
                    <div className="inline-flex items-center px-3 py-1 rounded-md bg-zinc-800/60 border border-zinc-700 text-indigo-500 text-sm font-semibold">
                        {activeConnections}
                    </div>
                    <div className="status-tooltip">
                        {activeConnections === 1
                            ? `There is currently ${activeConnections} person here`
                            : `There are currently ${activeConnections} people here`}
                    </div>
                </div>
            </div>
        </section>
    );
}
