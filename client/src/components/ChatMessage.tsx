import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckIcon } from "./icons/CheckIcon";
import { CopyIcon } from "./icons/CopyIcon";
import { EditIcon } from "./icons/EditIcon";
import { ReactionIcon } from "./icons/ReactionIcon";
import { ReplyIcon } from "./icons/ReplyIcon";
import { TrashIcon } from "./icons/TrashIcon";
import { formatTimestamp } from "../utils/dates";
import { IconButton } from "./IconButton";
import { useLongPress } from "../hooks/useLongPress";
import { TOUCH_DEVICE } from "../utils/device";
import { Spinner } from "./Spinner";
import type { DOMEvent, MessageData } from "../types/chat";
import { lazy, memo, Suspense, useCallback, useEffect, useMemo } from "react";

interface ChatMessageProps extends DOMEvent {
    msg: MessageData;
    username: string;
    today: Date;
    registerRef: (id: string, el: HTMLDivElement | null) => void;
    onReplyJump: (id: string) => void;
    replyingTo: MessageData | null;
    isEmojiPickerOpen: boolean;
    isCopied: boolean;
    onCopy: (msg: MessageData) => void;
    onReply: (msg: MessageData) => void;
    onEdit: (msg: MessageData) => void;
    onDelete: (id: string) => void;
    onAddReaction: (messageId: string, emoji: string) => void;
    onImageClick: (src: string | null) => void;
    onImageError: (ev: React.SyntheticEvent<HTMLImageElement, Event>) => void;
    onSetEmojiPickerOpenId: (id: string | null) => void;
};

const EmojiPicker = lazy(() => import("./EmojiPicker"));

export const ChatMessage = memo(function ChatMessage({
    msg,
    username,
    today,
    registerRef,
    onReplyJump,
    replyingTo,
    isEmojiPickerOpen,
    isCopied,
    onCopy,
    onReply,
    onEdit,
    onDelete,
    onAddReaction,
    onImageClick,
    onImageError,
    onSetEmojiPickerOpenId,
    onLongPressMessage
}: ChatMessageProps) {

    useEffect(() => {
        console.log("Rendered", msg.id);
    });

    const markdownComponents = useMemo(() => ({
        img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
            <img
                {...props}
                className="chat-message-image-single cursor-pointer"
                onClick={() => onImageClick(props.src ?? null)}
            />
        ),

        a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
            <a
                {...props}
                rel="noopener noreferrer"
                title={props.href}
            >
                {props.children}
            </a>
        ),
    }), [onImageClick]);

    const handleLongPress = useCallback(() => {
        onLongPressMessage?.(msg);
    }, [onLongPressMessage, msg]);

    const longPress = useLongPress({
        delay: 500,
        callback: handleLongPress,
    });

    const handleEmojiReactionSelect = useCallback((emoji: string) => {
        onAddReaction(msg.id, emoji);
        onSetEmojiPickerOpenId(null)
    }, [onAddReaction, onSetEmojiPickerOpenId, msg.id]);

    const handleEmojiReactionClose = useCallback(() => {
        onSetEmojiPickerOpenId(null);
    }, [onSetEmojiPickerOpenId]);

    return (
        <div
            ref={(el) => registerRef(msg.id, el)}
            className={`chat-message text-message relative 
                        ${msg.user === username ? "chat-message-self" : ""}
                        ${(msg.replyTo?.user === username || msg.text.includes(`@${username}`)) ? "chat-message-ping" : ""}
                        `}
            {...longPress}
        >
            {/* Reply indicator */}
            {msg.replyTo && (
                <div className="reply-wrapper">
                    <div
                        className="reply-indicator cursor-pointer"
                        onClick={() => onReplyJump(msg.replyTo!.id)}
                    >
                        {replyingTo ? (
                            <>
                                <span className="text-mention-xs">{msg.replyTo!.user}</span>
                                {replyingTo.text.length > 75
                                    ? replyingTo.text.slice(0, 75) + " ..."
                                    : replyingTo.text}
                            </>
                        ) : (
                            <span className="italic ml-1">message deleted</span>
                        )}

                    </div>
                </div>
            )}

            {/* Add Reaction's Emoji Picker - only on non-touchscreen */}
            {!TOUCH_DEVICE && isEmojiPickerOpen && (
                <Suspense fallback={<Spinner />}>
                    <EmojiPicker
                        onSelect={handleEmojiReactionSelect}
                        onClose={handleEmojiReactionClose}
                        className="absolute right-0 top-10 z-5"
                        navPosition="none"
                    />
                </Suspense>
            )}

            {/* Hover actions (only on non-touchscreen) */}
            {!TOUCH_DEVICE && (
                <div className="chat-message-actions">
                    <IconButton
                        icon={<ReactionIcon className="size-4" />}
                        title="Add reaction"
                        className="text-xs"
                        onClick={() => onSetEmojiPickerOpenId(msg.id)}
                    />

                    {msg.user === username && (
                        <IconButton
                            icon={<EditIcon className="size-4" />}
                            title="Edit"
                            className="text-xs"
                            onClick={() => onEdit(msg)}
                        />
                    )}

                    <IconButton
                        icon={isCopied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                        title="Copy"
                        className="text-xs"
                        onClick={() => onCopy(msg)}
                    />

                    {msg.user === username && (
                        <IconButton
                            icon={<TrashIcon className="size-4" />}
                            title="Delete"
                            className="text-xs"
                            onClick={() => onDelete(msg.id)}
                        />
                    )}

                    <IconButton
                        icon={<ReplyIcon className="size-4" />}
                        title="Reply"
                        className="text-xs"
                        onClick={() => onReply(msg)}
                    />
                </div>
            )}

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
                        components={markdownComponents}
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
                        onClick={() => onImageClick(msg.images?.[0].url ?? null)}
                        onError={onImageError}
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
                                onClick={() => onImageClick(img.url)}
                                onError={onImageError}
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
                        onClick={() => onAddReaction(msg.id, r.emoji)}
                    >
                        <span>{r.emoji}</span>
                        {r.users.length > 1 && <span className="text-xs">{r.users.length}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}, (prev, next) => {        // only re-render this chat message if any of these are false
    return prev.msg === next.msg && prev.isCopied === next.isCopied && prev.isEmojiPickerOpen === next.isEmojiPickerOpen;
});