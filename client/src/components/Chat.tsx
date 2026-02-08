import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { Thumbnail } from "./Thumbnail";
import { EmojiIcon } from "./icons/EmojiIcon";
import { GifIcon } from "./icons/GifIcon";
import { ImageIcon } from "./icons/ImageIcon";
import { ChatActionBar } from "./ChatActionBar";
import { useChatUploads } from "../hooks/useChatUploads";
import { useChatEmbed } from "../hooks/useChatEmbed";
import { useChatMentions } from "../hooks/useChatMentions";
import { useCurrentDay } from "../hooks/useCurrentDay";
import { useTurnstile } from "../hooks/useTurnstile";
import { validateMedia } from "../utils/media";
import { PLACEHOLDER_IMG } from "../constants/chat";
import { useChatSend } from "../hooks/useChatSend";
import { ChatMessage } from "./ChatMessage";
import { InputModal } from "./InputModal";
import { IconButton } from "./IconButton";
import { EditIcon } from "./icons/EditIcon";
import { TrashIcon } from "./icons/TrashIcon";
import { CopyIcon } from "./icons/CopyIcon";
import { ReplyIcon } from "./icons/ReplyIcon";
import { ReactionIcon } from "./icons/ReactionIcon";
import { ButtonDrawer } from "./ButtonDrawer";
import { TOUCH_DEVICE } from "../utils/device";
import { Spinner } from "./Spinner";
import type { MessageActionData, FileData, MessageData, SendPayload, DrawerAction } from "../types/chat";

export type Props = {
    username: string,
    users: string[],
    messages: MessageData[];
    connected: boolean;
    activeConnections: number;
    startChat: (token?: string) => void;
    sendMessage: (msg: SendPayload) => void;
    editMessage: (messageId: string, text: string) => void;
    deleteMessage: (msg: string) => void;
    addReaction: (messageId: string, emoji: string) => void;
};

// lazy load the EmojiPicker
const EmojiPicker = lazy(() => import("./EmojiPicker"));

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
}: Props) {
    const [input, setInput] = useState("");
    const [action, setAction] = useState<MessageActionData | null>(null);
    const [copyId, setCopydId] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const copyTimeoutRef = useRef<number | null>(null);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiPickerOpenId, setEmojiPickerOpenId] = useState<string | null>(null);

    const [drawerMessage, setDrawerMessage] = useState<MessageData | null>(null);

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

    const drawerActions: DrawerAction[] = drawerMessage
        ? [
            {
                key: "reaction",
                label: "Add reaction",
                icon: <ReactionIcon />,
                onPress: () => {
                    setEmojiPickerOpenId(drawerMessage.id);
                    setDrawerMessage(null);
                },
            },
            {
                key: "reply",
                label: "Reply",
                icon: <ReplyIcon />,
                onPress: () => {
                    onReplyMessage(drawerMessage);
                    setDrawerMessage(null);
                },
            },
            {
                key: "copy",
                label: "Copy",
                icon: <CopyIcon />,
                onPress: () => {
                    onCopyMessage(drawerMessage);
                    setDrawerMessage(null);
                },
            },
            ...(drawerMessage.user === username
                ? [
                    {
                        key: "edit",
                        label: "Edit",
                        icon: <EditIcon />,
                        onPress: () => {
                            onEditMessage(drawerMessage);
                            setDrawerMessage(null);
                        },
                    },
                    {
                        key: "delete",
                        label: "Delete",
                        icon: <TrashIcon />,
                        destructive: true,
                        onPress: () => {
                            deleteMessage(drawerMessage.id);
                            setDrawerMessage(null);
                        },
                    },
                ]
                : []),
        ]
        : [];

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

    const checkIfAtBottom = (el: HTMLDivElement) => {
        return el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    };

    const handleScroll = () => {
        const el = messagesRef.current;
        if (!el) return;
        isAtBottom.current = checkIfAtBottom(el);
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
            const combined = [...prev, ...newPreviews.filter((x): x is FileData => x !== null)];
            return combined.slice(0, 4);
        });

        e.target.value = "";
    };

    const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const el = e.currentTarget;
        if (el.src !== PLACEHOLDER_IMG) {
            el.src = PLACEHOLDER_IMG;
            el.alt = "Could not display image";
            el.title = "Could not display image";
        }
    }, []);

    const handleEmojiInputSelect = useCallback((emoji: string) => {
        setInput((v) => v + emoji);
    }, []);

    const handleEmojiInputClose = useCallback(() => {
        setShowEmojiPicker(false);
    }, []);

    const handleEmojiReactionSelect = useCallback((emoji: string) => {
        if (emojiPickerOpenId) {
            addReaction(emojiPickerOpenId, emoji);
            setEmojiPickerOpenId(null);
        }
    }, [emojiPickerOpenId, addReaction, setEmojiPickerOpenId]);

    const handleEmojiReactionClose = useCallback(() => {
        setEmojiPickerOpenId(null)
    }, []);

    const onLongPress = useCallback((msg: MessageData) => {
        if (TOUCH_DEVICE) setDrawerMessage(msg);
    }, []);

    const registerMessageRef = useCallback((id: string, el: HTMLDivElement | null) => {
        if (el) {
            messageRefs.current[id] = el;
        }
    }, []);

    const scrollToMessage = useCallback((id: string) => {
        const el = messageRefs.current[id];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, []);

    const onEditMessage = useCallback((m: MessageData) => {
        setAction({ type: "edit", messageId: m.id });
        setInput(m.text);
        textareaRef.current?.focus();
    }, []);

    const onCopyMessage = useCallback((m: MessageData) => {
        navigator.clipboard.writeText(m.text);
        setCopydId(m.id);
        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = window.setTimeout(() => {
            setCopydId(null);
        }, 2000);
    }, []);

    const onReplyMessage = useCallback((m: MessageData) => {
        setAction({
            type: "reply",
            name: m.user,
            messageId: m.id,
        });
        textareaRef.current?.focus();
    }, []);

    return (
        <section className="chat-panel">
            {/* Messages area/window */}
            <div
                ref={messagesRef}
                className="chat-messages scrollbar-custom"
                onScroll={handleScroll}
            >
                {messages.map((msg) => {

                    const replyToMessage =
                        msg.replyTo
                            ? messages.find(m => m.id === msg.replyTo?.id) ?? null
                            : null;

                    return (
                        <ChatMessage
                            msg={msg}
                            username={username}
                            today={today}
                            registerRef={registerMessageRef}
                            onReplyJump={scrollToMessage}
                            replyingTo={replyToMessage}
                            isEmojiPickerOpen={emojiPickerOpenId === msg.id}
                            isCopied={copyId === msg.id}
                            onCopy={onCopyMessage}
                            onReply={onReplyMessage}
                            onEdit={onEditMessage}
                            onDelete={deleteMessage}
                            onAddReaction={addReaction}
                            onImageClick={setActiveImage}
                            onImageError={handleImageError}
                            onSetEmojiPickerOpenId={setEmojiPickerOpenId}
                            onLongPress={() => onLongPress(msg)}
                        />
                    );
                })}

                {/* Message Actions - for touchscreen only */}
                <ButtonDrawer
                    open={!!drawerMessage}
                    actions={drawerActions}
                    onClose={() => setDrawerMessage(null)}
                />

                {/* Image View Popup - on clicking any media */}
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
                        <div className="absolute bottom-full left-2 -mb-px flex items-baseline gap-2 py-0.5"
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
                    <InputModal
                        value={embed}
                        action="Embed"
                        placeholder="Enter an image or GIF link..."
                        error={embedError}
                        onChange={setEmbed}
                        onCancel={() => {
                            setEmbed(null);
                            setShowEmbedPopup(false);
                            setEmbedError(null);
                        }}
                        onSubmit={handleEmbed}
                        isOpen={showEmbedPopup}
                    />

                    {/* Chat input emoji picker */}
                    {!TOUCH_DEVICE && showEmojiPicker && (
                        <Suspense fallback={<Spinner />}>
                            <>
                                <div className="absolute bottom-full mb-2 right-0 w-auto">
                                    <EmojiPicker
                                        // onSelect={(emoji) => {
                                        //     setInput((v) => v + emoji);
                                        // }}
                                        onSelect={handleEmojiInputSelect}
                                        // onClose={() => setShowEmojiPicker(false)}
                                        onClose={handleEmojiInputClose}
                                    />
                                </div>
                            </>
                        </Suspense>
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
                        <IconButton
                            icon={<EmojiIcon />}
                            title="Emojis"
                            className="px-2"
                            onClick={() => setShowEmojiPicker((v) => !v)}
                        />

                        <IconButton
                            icon={<ImageIcon />}
                            title="Attach Media"
                            className="px-2"
                            disabled={!!embed}
                            onClick={() => fileInputRef.current?.click()}
                        />

                        <IconButton
                            icon={<GifIcon />}
                            title="Embed GIF/Image"
                            className="px-2"
                            disabled={!!embed || uploads.length > 0}
                            onClick={() => setShowEmbedPopup(true)}
                        />
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

            {/* Chat input emoji picker - mobile only */}
            {TOUCH_DEVICE && showEmojiPicker && (
                <Suspense fallback={<Spinner />}>
                    <div className="flex justify-center mt-2 mb-2 animate-slide-up">
                        <div className="w-screen rounded-t-2xl bg-zinc-900">
                            <EmojiPicker
                                // onSelect={(emoji) => {
                                //     setInput((v) => v + emoji);
                                // }}
                                onSelect={handleEmojiInputSelect}
                                // onClose={() => setShowEmojiPicker(false)}
                                onClose={handleEmojiInputClose}
                                navPosition="none"
                            />
                        </div>
                    </div>
                </Suspense>
            )}

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

            {/* Drawer Emoji Picker - for reactions on touchscreen only*/}
            {TOUCH_DEVICE && emojiPickerOpenId && (
                <Suspense fallback={<Spinner />}>
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40 bg-black/40"
                            onClick={() => setEmojiPickerOpenId(null)}
                        />

                        {/* Drawer */}
                        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-zinc-900 p-4 animate-slide-up">
                            <EmojiPicker
                                // onSelect={(emoji) => {
                                //     addReaction(emojiPickerOpenId, emoji);
                                //     setEmojiPickerOpenId(null);
                                // }}
                                onSelect={handleEmojiReactionSelect}
                                // onClose={() => setEmojiPickerOpenId(null)}
                                onClose={handleEmojiReactionClose}
                                className="w-full"
                                navPosition="none"
                            />
                        </div>
                    </>
                </Suspense>
            )}
        </section>
    );
}
