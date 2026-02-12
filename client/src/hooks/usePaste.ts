import { useCallback } from "react";
import { validateMedia } from "../utils/media";
import { detectGithub, detectSpotify, detectTwitter, detectYouTube, getContent } from "../utils/clipboard";
import type { PasteResult } from "../types/chat";

interface UsePasteProps {
    callback: (src: PasteResult) => void;
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
                if (item.type === "text/html") {    // only for images/gifs whose url can be embedded
                    const html = await getContent(item);
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
                            if (result.ok) callback({ type: "image", url: src });
                            else callback({ type: "media", error: result.reason });
                            return;
                        } catch (err) {
                            console.warn("Media rejected:", err);
                            continue;
                        }
                    }
                } else if (item.type === "text/plain") {
                    const html = await getContent(item);
                    const doc = new DOMParser().parseFromString(html, "text/html");
                    const text = doc.body.textContent?.trim();
                    const detectors = [detectYouTube, detectSpotify, detectTwitter, detectGithub];
                    if (text) {
                        for (const detect of detectors) {
                            const result = detect(text);
                            if (result) {
                                callback(result);
                                return;
                            }
                        }
                    }
                } else if (item.type.startsWith("image/")) {
                    if (!allowedTypes.includes(item.type)) continue;

                    e.preventDefault();
                    const file = item.getAsFile();
                    if (!file) continue;

                    const url = URL.createObjectURL(file);
                    const result = await validateMedia(url);
                    if (result.ok) {
                        callback({ type: "image", url, file });
                    }
                    else {
                        URL.revokeObjectURL(url);
                        callback({ type: "media", error: result.reason });
                    }
                    return;
                }
            }

            callback(null);
        },
        [callback]
    );

    return { handlePaste };
}
