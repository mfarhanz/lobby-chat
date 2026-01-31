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
import { EmojiPicker } from "./EmojiPicker";
import ChatActionBar from "./ChatActionBar";
import type { ChatAction, ChatProps, ChatFile, MediaValidationResult, SendPayload, MediaMeta } from "../types/chat";
import { CheckIcon } from "./icons/CheckIcon";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const PLACEHOLDER_IMG = "https://savethefrogs.com/wp-content/uploads/placeholder-image-blue-landscape.png";

export function Chat({
    username,
    users,
    messages,
    connected,
    activeConnections,
    startChat,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
}: ChatProps) {
    const [input, setInput] = useState("");
    const [now, setNow] = useState(new Date());

    const [embed, setEmbed] = useState<string | null>(null);
    const [embedError, setEmbedError] = useState<string | null>(null);
    const [showEmbedPopup, setShowEmbedPopup] = useState(false);

    const [uploads, setUploads] = useState<ChatFile[]>([]);
    const uploadsRef = useRef<ChatFile[]>([]);

    const [action, setAction] = useState<ChatAction | null>(null);
    const [copyId, setCopydId] = useState<string | null>(null);
    const copyTimeoutRef = useRef<number | null>(null);

    const [activeImage, setActiveImage] = useState<string | null>(null);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiPickerOpenId, setEmojiPickerOpenId] = useState<string | null>(null);


    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);


    const messagesRef = useRef<HTMLDivElement | null>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const turnstileRendered = useRef(false);
    const isAtBottom = useRef(true);

    const cleanupPreviewUrls = () => {
        uploadsRef.current.forEach(({ url }) => {
            URL.revokeObjectURL(url);
        });
    };

    useEffect(() => cleanupPreviewUrls, []);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        uploadsRef.current = uploads;
    }, [uploads]);

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

        // 1. if already at bottom -> always scroll
        // 2. if scrolled up -> scroll only if the last message is from the client
        if (isAtBottom.current || lastMessage?.user === username) {
            el.scrollTo({
                top: el.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages, username]);

    const handleSend = async () => {
        // if popup is still open, block sending
        if (showEmbedPopup) {
            setEmbedError("Please click Embed to validate the media before sending.");
            return;
        }

        const hasText = !!input.trim();
        const hasValidEmbed = !!embed && !embedError;
        const hasUploads = uploadsRef.current.length > 0;

        // if no text and either no embed or embedError exists, block sending
        if (!hasText && !hasValidEmbed && !hasUploads) return;

        // format text
        let sendText = input;
        if (embed) sendText += `\n\n![](${embed})`;     // append any image/gif embeds - this will rendered via markdown
        sendText = sendText.replace(/@(\S+)/g, "[`@$1`](#ping)");    // format pings differently from text

        // send any attached files to temporary online storage
        const files = uploadsRef.current.map(u => u.file);
        const images = files.length
            ? await fakeUploadFiles(files)
            : undefined;

        // if editing message, don't send anything, just modify the existing chat message
        if (action?.type === "edit" && action.messageId) {
            editMessage(action.messageId, sendText);
        }
        else {
            // if replying to someone, pass in the reply object so ChatMessage can be constructed accordingly later
            const payload: SendPayload = {
                text: sendText,
                images: images,
                ...(action?.type === "reply" && {
                    replyTo: {
                        id: action.messageId,
                        user: action.name,
                    },
                }),
            };

            sendMessage(payload);
        }

        cleanupPreviewUrls();

        // reset
        setInput("");
        setEmbed(null);
        setAction(null);
        setUploads([]);
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

        const result = await validateMedia(embed);

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

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;

        const newPreviews = await Promise.all(files.map(async (file) => {
            const url = URL.createObjectURL(file);
            const validation = await validateMedia(url, file);
            if (!validation.ok) {
                URL.revokeObjectURL(url);
                return null; // skip invalid
            }
            return { file, url };
        }));

        setUploads(prev => {
            const combined = [...prev, ...newPreviews.filter((x): x is ChatFile => x !== null)];
            return combined.slice(0, 4);
        });

        e.target.value = "";
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const el = e.currentTarget;
        if (el.src !== PLACEHOLDER_IMG) {
            el.src = PLACEHOLDER_IMG;
            el.alt = "Could not display image";
            el.title = "Could not display image";
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInput(value);
        autoResize(e);

        const cursorPos = e.target.selectionStart;
        const textUpToCursor = value.slice(0, cursorPos);

        const match = textUpToCursor.match(/@(\w*)$/);
        if (match) {
            const query = match[1].toLowerCase();
            const filtered = users.filter(u =>
                u.toLowerCase().startsWith(query)
            );
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
            setHighlightedIndex(0);
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((i) =>
                    i === 0 ? suggestions.length - 1 : i - 1
                );
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                selectSuggestion(suggestions[highlightedIndex]);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
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

    const selectSuggestion = (username: string) => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const cursorPos = textarea.selectionStart;
        const textBefore = input.slice(0, cursorPos);
        const textAfter = input.slice(cursorPos);

        // replace the last @word with the selected username
        const newTextBefore = textBefore.replace(/@(\w*)$/, `@${username} `);

        const newInput = newTextBefore + textAfter;
        setInput(newInput);

        // move cursor to right after inserted username
        const newCursorPos = newTextBefore.length;
        setTimeout(() => {
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);

        setShowSuggestions(false);
        setSuggestions([]);
    };

    const checkIfAtBottom = (el: HTMLDivElement) => {
        return el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    };

    const handleScroll = () => {
        const el = messagesRef.current;
        if (!el) return;
        isAtBottom.current = checkIfAtBottom(el);
    };

    const validateMedia = (url: string, file?: File): Promise<MediaValidationResult> => {
        return new Promise((resolve) => {
            // Size check (for attachments only)
            if (file && file.size > MAX_FILE_SIZE) {
                resolve({ ok: false, reason: 3 });
                console.log("file too big");
                return;
            }

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

    async function fakeUploadFiles(
        files: File[],
    ): Promise<MediaMeta[]> {
        return files.map(file => {
            const id = crypto.randomUUID();
            const key = `chat/${id}-${file.name}`;

            return {
                id,
                key,
                url: `https://fake-cdn.local/${key}`,
                mime: file.type,
                size: file.size,
            };
        });
    }

    return (
        <section className="chat-panel">
            {/* Messages area */}
            <div
                ref={messagesRef}
                className="chat-messages scrollbar-custom"
                onScroll={handleScroll}
            >
                {messages.map((msg) => (
                    // Chat Message
                    <div
                        key={msg.id}
                        ref={(el) => {
                            messageRefs.current[msg.id] = el;
                        }}
                        className={`chat-message text-message relative 
                                    ${msg.user === username ? "chat-message-self" : ""}
                                    ${(msg.replyTo?.user === username || msg.text.includes(`@${username}`)) ? "chat-message-ping" : ""}
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

                        {/* Add Reaction's Emoji Picker */}
                        {emojiPickerOpenId === msg.id && (
                            <EmojiPicker
                                onSelect={(emoji) => {
                                    addReaction(msg.id, emoji);
                                    setEmojiPickerOpenId(null);
                                }}
                                onClose={() => setEmojiPickerOpenId(null)}
                                className="absolute right-0 top-10 z-5"
                                navPosition="none"
                                maxFrequentRows={2}
                            />
                        )}

                        {/* Hover actions */}
                        <div className="chat-message-actions">
                            <button
                                className="floating-action-btn"
                                title="Add reaction"
                                onClick={() => setEmojiPickerOpenId(msg.id)}
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
                                <ReactMarkdown
                                    skipHtml
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        img: ({ ...props }) => (
                                            <img
                                                {...props}
                                                className="chat-message-image-single cursor-pointer"
                                                onClick={() => setActiveImage(props.src ?? null)}
                                            />
                                        ),
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>

                            {msg.edited && (
                                <span className="chat-message-edited">(edited)</span>
                            )}
                        </div>

                        {/* Chat message image attachments */}
                        {msg.images && (
                            msg.images.length === 1 ? (
                                <img
                                    src={msg.images[0].url}
                                    alt="uploaded"
                                    className="chat-message-image-single"
                                    loading="lazy"
                                    onClick={() => setActiveImage(msg.images?.[0].url ?? null)}
                                    onError={handleImageError}
                                />
                            ) : (
                                <div className="chat-message-images-group">
                                    {msg.images.map((img) => (
                                        <img
                                            key={img.id}
                                            src={img.url}
                                            alt="uploaded"
                                            className="chat-message-image-multi"
                                            loading="lazy"
                                            onClick={() => setActiveImage(img.url)}
                                            onError={handleImageError}
                                        />
                                    ))}
                                </div>
                            )
                        )}

                        {/* Chat message reaction pills */}
                        <div className="message-reactions flex gap-1 mt-1">
                            {msg.reactions?.map((r) => (
                                <div
                                    key={r.emoji}
                                    className={`reaction-tag 
                                        ${r.users.includes(username)
                                            ? "bg-blue-500/25 text-blue-300 "
                                            : "bg-zinc-700/70"
                                        }`}
                                    onClick={() => addReaction(msg.id, r.emoji)}
                                >
                                    <span>{r.emoji}</span>
                                    {r.users.length > 1 && <span className="text-xs">{r.users.length}</span>}
                                </div>
                            ))}
                        </div>

                    </div>
                ))}

                {activeImage && (
                    <div
                        className="fixed inset-0 z-50 bg-black/80
                   flex items-center justify-center"
                        onClick={() => setActiveImage(null)}
                    >
                        <img
                            src={activeImage}
                            alt="full size"
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

            </div>

            {/* Chat Input area */}
            <div className="chat-input-row">
                <div className="chat-input-wrapper">

                    {/* Media preview row */}
                    {(embed || uploads.length > 0) && (
                        <div
                            className="absolute bottom-full left-2 -mb-px flex items-baseline gap-2 py-0.5"
                        >
                            {embed && !embedError && (
                                <Thumbnail
                                    src={embed}
                                    onRemove={() => setEmbed(null)}
                                />
                            )}

                            {uploads.map(({ url }, index) => (
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

                    {/* Chat Action indicator row */}
                    {action && (
                        <ChatActionBar
                            type={action.type}
                            name={action.type === "reply" ? action.name : undefined}
                            onClose={() => setAction(null)}
                        />
                    )}

                    {/* Chat input ping suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="chat-message-mention-list">
                            {suggestions.map((u, i) => (
                                <li
                                    key={u}
                                    className={`px-4 py-2 text-mention-sm cursor-pointer 
                                                ${i === highlightedIndex ? "bg-zinc-700/30" : ""} 
                                                hover:bg-zinc-700/30`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectSuggestion(u);
                                    }}
                                >
                                    {u}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Chat Input */}
                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        value={input}
                        disabled={!connected}
                        placeholder="Type a message..."
                        rows={1}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />

                    {/* Media Embed popup */}
                    {showEmbedPopup && (
                        <div
                            className="absolute bottom-full mb-2 p-3 right-0 w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg "
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

                    {/* Chat input emoji picker */}
                    {showEmojiPicker && (
                        <EmojiPicker
                            onSelect={(emoji) => {
                                setInput((v) => v + emoji);
                                setShowEmojiPicker(false);
                            }}
                            onClose={() => setShowEmojiPicker(false)}
                            className="absolute bottom-full mb-2 right-0 w-auto"
                        />
                    )}

                    {/* Media file explorer */}
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                    />

                    {/* Chat Input buttons */}
                    <div className="chat-input-btn-group">
                        <button
                            type="button"
                            className="chat-input-btn"
                            title="Emojis"
                            onClick={() => setShowEmojiPicker((v) => !v)}
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
                            className={`chat-input-btn ${embed || uploads.length > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                            title="Embed GIF/Image"
                            disabled={!!embed || uploads.length > 0}
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

            {/* Chat live count */}
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
