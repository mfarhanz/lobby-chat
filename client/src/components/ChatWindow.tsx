import type { ListChildComponentProps } from "react-window";
import { ChatMessage } from "./ChatMessage";
import { memo, useCallback } from "react";

export const ChatWindow = memo(function ChatWindow({ index, style, data }: ListChildComponentProps) {
    const {
        messages,
        messageOrder,
        username,
        today,
        copyId,
        emojiPickerOpenId,
        registerRef,
        scrollToMessage,
        sizeMap,
        listRef,
        rowRefs,
        handlers,
    } = data;

    const msgId = messageOrder[index];
    const msg = messages.get(msgId);
    const replyToMessage = msg?.replyTo ? messages.get(msg.replyTo.id) ?? null : null;

    const handleSizeChange = useCallback(() => {
        const el = rowRefs.current.get(msgId);
        if (!el) return;

        const newHeight = el.getBoundingClientRect().height;
        const oldHeight = sizeMap.current.get(msgId);
        if (oldHeight !== newHeight) {
            sizeMap.current.set(msgId, newHeight);
            listRef.current?.resetAfterIndex(index, true);
        }
    }, [rowRefs.current, msgId, sizeMap, listRef, index]);

    if (!msg) return null;

    return (
        <div style={style}>
            <div
                ref={registerRef(msgId, index)}
                className={`px-3 ${index === 0 ? "pt-3" : ""} ${index === messageOrder.length - 1 ? "pb-3" : "pb-2"}`}
            >
                <ChatMessage
                    id={`msg-${msgId}`}
                    msg={msg}
                    username={username}
                    today={today}
                    replyingTo={replyToMessage}
                    onReplyJump={scrollToMessage}
                    isEmojiPickerOpen={emojiPickerOpenId === msgId}
                    isCopied={copyId === msgId}
                    onSizeChange={handleSizeChange}
                    {...handlers}
                />
            </div>
        </div>
    );
});
