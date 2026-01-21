import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../types/socket";
import { Thumbnail } from "./Thumbnail";
import { EmojiIcon } from "./icons/EmojiIcon";
import { GifIcon } from "./icons/GifIcon";
import { ImageIcon } from "./icons/ImageIcon";

type ChatProps = {
    messages: ChatMessage[];
    connected: boolean;
    activeConnections: number;
    startChat: (token?: string) => void;
    sendMessage: (msg: string) => void;
};

type MediaValidationResult =
    | { ok: true }
    | { ok: false; reason: number };

type FilePreview = {
    file: File;
    url: string;
};

export function Chat({
    messages,
    connected,
    activeConnections,
    startChat,
    sendMessage,
}: ChatProps) {
    const [input, setInput] = useState("");
    const [now, setNow] = useState(new Date());

    const [embed, setEmbed] = useState<string | null>(null);
    const [embedError, setEmbedError] = useState<string | null>(null);
    const [showEmbedPopup, setShowEmbedPopup] = useState(false);

    const [upload, setUploads] = useState<FilePreview[]>([]);
    const uploadsRef = useRef<FilePreview[]>([]);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const turnstileRendered = useRef(false);

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

    // useEffect(() => {
    //     const timer = setInterval(() => {
    //         setNow(new Date());
    //     }, 5 * 60 * 1000); // update every 5mins

    //     return () => clearInterval(timer);
    // }, []);

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
        // 1) if popup is still open, block sending
        if (showEmbedPopup) {
            setEmbedError("Please click Attach to validate the media before sending.");
            return;
        }

        // 2) if no text and either no embed or embedError exists, block sending
        if (!input.trim() && (!embed || embedError)) return;

        let finalText = input;
        if (embed) {
            finalText += `\n\n![](${embed})`;
        }

        sendMessage(finalText);

        // reset
        setInput("");
        setEmbed(null);
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
            <div className="chat-messages scrollbar-custom">
                {messages.map((msg, i) => (
                    <div key={i} className="chat-message text-message">
                        <div className="chat-message-header">
                            <span className="chat-message-username">{msg.username}</span>
                            <span className="chat-message-time">
                                {formatTimestamp(msg.timestamp, now)}
                            </span>
                        </div>

                        <div className="chat-message-text">
                            <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>
                                {msg.text}
                            </ReactMarkdown>
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
                                        Attach
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

                    <div className="chat-input-icons">
                        <button
                            type="button"
                            className="chat-input-icon"
                            title="Emojis"
                            onClick={() => console.log("emoji")}
                        >
                            <EmojiIcon />
                        </button>
                        <button
                            type="button"
                            className={`chat-input-icon ${embed ? "opacity-50 cursor-not-allowed" : ""}`}
                            title="Images"
                            disabled={!!embed}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImageIcon />
                        </button>
                        <button
                            type="button"
                            className={`chat-input-icon ${embed || upload.length > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
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
