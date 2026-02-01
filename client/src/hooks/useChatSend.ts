// src/hooks/useChatSend.ts
import type { ChatAction, ChatFile, SendPayload } from "../types/chat";
import { fakeUploadFiles } from "../utils/media";

type UseChatSendParams = {
    sendMessage: (payload: SendPayload) => void;
    editMessage: (id: string, text: string) => void;
    cleanupPreviewUrls: () => void;
    uploadsRef: React.MutableRefObject<ChatFile[]>;
    embed: string | null;        // from useChatEmbed
    embedError: string | null;   // from useChatEmbed
    input: string;
    setInput: (v: string) => void;
    action: ChatAction | null;
    setAction: (v: ChatAction | null) => void;
};

export function useChatSend({
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
}: UseChatSendParams) {

    const handleSend = async () => {
        const hasText = !!input.trim();
        const hasValidEmbed = !!embed && !embedError;
        const hasUploads = uploadsRef.current.length > 0;

        // if no text and either no embed or embedError exists, block sending
        if (!hasText && !hasValidEmbed && !hasUploads) return;

        // format text
        let sendText = input;
        if (embed) sendText += `\n\n![](${embed})`;     // append any image/gif embeds - this will rendered via markdown
        sendText = sendText.replace(/@(\S+)/g, "[`@$1`](#ping)");       // format pings differently from text

        // send any attached files to temporary online storage
        const files = uploadsRef.current.map(u => u.file);
        const images = files.length
            ? await fakeUploadFiles(files)
            : undefined;

        // if editing message, don't send anything, just modify the existing chat message
        if (action?.type === "edit" && action.messageId) {
            editMessage(action.messageId, sendText);
        } else {
            const payload: SendPayload = {
                text: sendText,
                images,
                ...(action?.type === "reply" && {
                    replyTo: {                  // if replying to someone, create a reply object
                        id: action.messageId,
                        user: action.name
                    }
                })
            };

            sendMessage(payload);
        }

        cleanupPreviewUrls();

        // reset
        setInput("");
        setAction(null);
        uploadsRef.current = [];
    };

    return { handleSend };
}
