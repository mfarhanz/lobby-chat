import { useCallback } from "react";
import type { MessageActionData, FileData, SendIntentPayload, ReplyData } from "../types/chat";

interface UseChatSendProps {
    sendIntent: (
        payload: SendIntentPayload,
        textBody: string,
        files: FileData[],
        replyTo?: ReplyData,
    ) => Promise<void>;
    editMessage: (id: string, text: string) => void;
    cleanupPreviewUrls: () => void;
    uploadsRef: React.MutableRefObject<FileData[]>;
    embed: string | null;
    input: string;
    setInput: (v: string) => void;
    action: MessageActionData | null;
    setAction: (v: MessageActionData | null) => void;
};

export function useChatSend({
    sendIntent,
    editMessage,
    cleanupPreviewUrls,
    uploadsRef,
    embed,
    input,
    setInput,
    action,
    setAction,
}: UseChatSendProps) {

    const cleanupAfterSend = useCallback(() => {
        cleanupPreviewUrls();
        // reset
        setInput("");
        setAction(null);
        uploadsRef.current = [];
    }, [uploadsRef, setInput, setAction, cleanupPreviewUrls]);

    const handleSend = useCallback(async () => {
        const hasText = !!input.trim();
        const hasEmbed = !!embed;
        const hasUploads = uploadsRef.current.length > 0;

        // if no text and either no embed exists, block sending
        if (!hasText && !hasEmbed && !hasUploads) return;

        // format text
        let sendText = input;
        if (hasEmbed) sendText += `\n\n![](${embed})`;     // append any image/gif embeds - this will rendered via markdown
        sendText = sendText.replace(        // format pings differently from text
            /(^|[\s.,;:!?])(?<!`)@(\S+)/g,
            '$1[`@$2`](#ping)'
        );

        // if editing message, don't send anything, just modify the existing chat message
        if (action?.type === "edit" && action.messageId) {
            editMessage(action.messageId, sendText);
        } else {
            const files = uploadsRef.current.map(u => u.file);
            const payload: SendIntentPayload = {};

            if (hasText || hasEmbed) {
                payload.textLength = sendText.length;
                payload.textBytes = new TextEncoder().encode(sendText).length;
            }

            if (files.length) {
                payload.files = files
                    .filter((f): f is File => !!f)
                    .map(file => ({
                        mime: file.type,
                        size: file.size
                    }));
            }

            // if replying to someone, additionally create a reply object
            const replyTo = action?.type === "reply"
                ? { id: action.messageId, userId: action.userId }
                : undefined;

            await sendIntent(payload, sendText, uploadsRef.current, replyTo);
        }

        cleanupAfterSend();
    }, [embed, action, input, uploadsRef, editMessage, sendIntent, cleanupAfterSend]);

    return { handleSend };
}
