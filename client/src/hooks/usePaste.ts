import { useCallback } from "react";
import { validateMedia } from "../utils/media";
import { getHtml } from "../utils/clipboard";

interface UsePasteProps {
    callback: (src: string) => void;
};

export function usePaste({ callback }: UsePasteProps) {
    const handlePaste = useCallback(
        async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
            const items = e.clipboardData.items;
            const allowedTypes = [
                "image/png",
                "image/jpeg",
                "image/jpg",
                "image/webp",
                "image/bmp",
                "image/gif",
            ];

            for (const item of items) {
                if (item.type === "text/html") {
                    const html = await getHtml(item);
                    const doc = new DOMParser().parseFromString(html, "text/html");
                    const img = doc.querySelector("img");

                    // ensures an <img> present and url starts with http(s), and contains no quotes/spaces
                    if (img && /^https?:\/\/[^\s"']+$/i.test(img.src)) {
                        e.preventDefault();
                        const rawSrc = img.src;

                        try {
                            const cleanUrl = new URL(rawSrc);
                            // further check to ensure only allow http or https
                            if (cleanUrl.protocol !== 'http:' && cleanUrl.protocol !== 'https:') return;
                            const src = cleanUrl.href; // sanitized url
                            const result = await validateMedia(src);
                            if (result.ok) callback(src); 
                            else console.warn("Media rejected:", result.reason);
                        } catch (err) {
                            console.warn("Media rejected:", err);
                            return;
                        }
                    }
                } else if (item.type.startsWith("image/")) {
                    if (!allowedTypes.includes(item.type)) continue;

                    e.preventDefault();
                    const file = item.getAsFile();
                    if (!file) continue;

                    const url = URL.createObjectURL(file);
                    const valid = await validateMedia(url);
                    if (valid) callback(url);
                    else URL.revokeObjectURL(url);
                    return;
                }
            }
        },
        [callback]
    );

    return { handlePaste };
}
