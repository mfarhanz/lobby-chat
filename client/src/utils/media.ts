import { MAX_FILE_SIZE, MAX_PIXEL_COUNT } from "../constants/chat";
import type { MediaMeta, MediaValidationResult } from "../types/chat";

export const validateMedia = (url: string, file?: File): Promise<MediaValidationResult> => {
    return new Promise((resolve) => {
        // Size check (for attachments only)
        if (file && file.size > MAX_FILE_SIZE) {
            resolve({ ok: false, reason: 3 });
            return;
        }

        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            const oversized = w > 8000 || h > 8000 || w * h > MAX_PIXEL_COUNT;
            if (oversized) {
                resolve({ ok: false, reason: 2 });
            } else {
                resolve({ ok: true });
            }
        };
        img.onerror = () => resolve({ ok: false, reason: 1 });
        img.src = url;
    });
};

export async function fakeUploadFiles(
    files: File[],
): Promise<MediaMeta[]> {
    return files.map(file => {
        const id = crypto.randomUUID();
        const key = `chat/${id}-${file.name}`;

        return {
            id,
            key,
            url: `https://fake-cdn.local/${key}`,
            mime: file.type,
            size: file.size,
        };
    });
}
