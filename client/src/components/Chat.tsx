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
import { ChatActionBar } from "./ChatActionBar";
import { CheckIcon } from "./icons/CheckIcon";
import { useChatUploads } from "../hooks/useChatUploads";
import { useChatEmbed } from "../hooks/useChatEmbed";
import { useChatMentions } from "../hooks/useChatMentions";
import { useCurrentDay } from "../hooks/useCurrentDay";
import { useTurnstile } from "../hooks/useTurnstile";
import { formatTimestamp } from "../utils/dates";
import { validateMedia } from "../utils/media";
import type { ChatAction, ChatProps, ChatFile } from "../types/chat";
import { PLACEHOLDER_IMG } from "../constants/chat";
import { useChatSend } from "../hooks/useChatSend";

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
    const [action, setAction] = useState<ChatAction | null>(null);
    const [copyId, setCopydId] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const copyTimeoutRef = useRef<number | null>(null);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiPickerOpenId, setEmojiPickerOpenId] = useState<string | null>(null);

    const messagesRef = useRef<HTMLDivElement | null>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const isAtBottom = useRef(true);

    const {
        embed,
        setEmbed,
        embedError,
        setEmbedError,
        showEmbedPopup,
        setShowEmbedPopup,
        handleEmbed,
    } = useChatEmbed();

    const {
        uploads,
        setUploads,
        uploadsRef,
        cleanupPreviewUrls,
    } = useChatUploads();

    const {
        suggestions,
        showSuggestions,
        highlightedIndex,
        selectSuggestion,
        handleInputChange,
        handleKeyDown,
    } = useChatMentions({ users, input, setInput, textareaRef });

    const {
        handleSend
    } = useChatSend({
        sendMessage,
        editMessage,
        cleanupPreviewUrls,
        uploadsRef,
        embed,
        embedError,
        input,
        setInput,
        action,
        setAction,
    });

    const today = useCurrentDay();

    useTurnstile(startChat);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
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

    const onSend = async () => {
        if (!textareaRef.current) return;

        // if popup is still open, block sending
        if (showEmbedPopup) {
            setEmbedError("Please click Embed to validate the media before sending.");
            return;
        }

        await handleSend();

        // reset local states
        setEmbed(null);
        setUploads([]);
        // reset textarea height
        if (textareaRef.current) textareaRef.current.style.height = "auto";
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

    const checkIfAtBottom = (el: HTMLDivElement) => {
        return el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    };

    const handleScroll = () => {
        const el = messagesRef.current;
        if (!el) return;
        isAtBottom.current = checkIfAtBottom(el);
    };

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
                                {formatTimestamp(msg.timestamp, today)}
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
                        onKeyDown={(e) => handleKeyDown(e, onSend)}
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
                    onClick={onSend}
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
