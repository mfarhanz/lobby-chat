import { useState } from "react";
import { validateMedia } from "../utils/media";

export function useChatEmbed() {
    const [embed, setEmbed] = useState<string | null>(null);
    const [embedError, setEmbedError] = useState<string | null>(null);
    const [showEmbedPopup, setShowEmbedPopup] = useState(false);

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

    return {
        embed,
        setEmbed,
        embedError,
        setEmbedError,
        showEmbedPopup,
        setShowEmbedPopup,
        handleEmbed,
    };
}
