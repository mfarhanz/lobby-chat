import type { MessageActionData, FileData, SendPayload } from "../types/chat";
import { fakeUploadFiles } from "../utils/media";

interface UseChatSendProps {
    sendMessage: (payload: SendPayload) => void;
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
    sendMessage,
    editMessage,
    cleanupPreviewUrls,
    uploadsRef,
    embed,
    input,
    setInput,
    action,
    setAction,
}: UseChatSendProps) {

    const handleSend = async () => {
        const hasText = !!input.trim();
        const hasValidEmbed = !!embed;
        const hasUploads = uploadsRef.current.length > 0;

        // if no text and either no embed exists, block sending
        if (!hasText && !hasValidEmbed && !hasUploads) return;

        // format text
        let sendText = input;
        if (embed) sendText += `\n\n![](${embed})`;     // append any image/gif embeds - this will rendered via markdown
        sendText = sendText.replace(    // format pings differently from text
            /(^|[\s.,;:!?])(?<!`)@(\S+)/g,
            '$1[`@$2`](#ping)'
        );
        console.log(sendText);

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
