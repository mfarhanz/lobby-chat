import pica from "pica";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { CancelToken, MediaValidationResult, UploadMeta } from "../types/chat";
import {
    MAX_GIF_UPLOAD_DIMS, MAX_GIF_UPLOAD_SIZE, MAX_IMAGE_UPLOAD_DIMS, MAX_FILE_UPLOAD_SIZE,
    MAX_IMAGE_UPLOAD_SIZE, MAX_PIXEL_COUNT, MAX_ACCEPTED_FILE_SIZE
} from "../constants/chat";

// initialise pica
const picaInstance = pica({ features: ['js', 'wasm', 'ww'] });

// initialise ffmpeg
let ffmpeg = new FFmpeg();

// buffer for holding pending gifs for compression
let gifQueue: Promise<void> = Promise.resolve();

function queueGif<T>(job: () => Promise<T>): Promise<T> {
    const next = gifQueue.then(job);
    gifQueue = next.then(() => { }).catch(() => { }); // prevent queue from breaking on errors
    return next;
}

export const validateMedia = (url: string, file?: File): Promise<MediaValidationResult> => {
    return new Promise((resolve) => {
        // Size check (for attachments only)
        if (file && file.size > MAX_FILE_UPLOAD_SIZE) {
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

export async function compressMedia(
    file: File,
    options?: {
        cancelToken?: CancelToken,
        onProgress?: (progress: number) => void;
    }
): Promise<File | undefined | null> {
    if (file.size < MAX_IMAGE_UPLOAD_SIZE) return file;
    else if (file.size > MAX_ACCEPTED_FILE_SIZE) return;

    try {
        let blob: Blob | null;
        if (file.type === "image/gif") {
            blob = await queueGif(() =>
                compressGif({
                    file,
                    maxSize: MAX_GIF_UPLOAD_SIZE,
                    maxDims: MAX_GIF_UPLOAD_DIMS,
                    quality: 100,
                    cancelToken: options?.cancelToken,
                    onProgress: options?.onProgress
                })
            );
        } else {
            blob = await compressImage({
                file,
                maxSize: MAX_IMAGE_UPLOAD_SIZE,
                maxDims: MAX_IMAGE_UPLOAD_DIMS,
                quality: 100,
                onProgress: options?.onProgress
            });
        }
        if (blob) return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
    } catch (err) {
        console.error(err);
        return null;
    }
}

export async function compressImage({
    file,
    maxSize = undefined,
    maxDims = undefined,
    quality = 100,
    onProgress
}: {
    file: File;
    maxSize?: number;
    maxDims?: number;
    quality?: number;
    onProgress?: (progress: number) => void;
}): Promise<Blob | null> {

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
        const scale = Math.min(
            (maxDims && maxDims > 0) ? maxDims / bitmap.width : 1,
            (maxDims && maxDims > 0) ? maxDims / bitmap.height : 1,
            1
        );

        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);
        const size = (maxSize && maxSize > 5000) ? maxSize : undefined;
        const targetCanvas = new OffscreenCanvas(width, height);
        let currentStep = 0;

        await picaInstance.resize(bitmap, targetCanvas as unknown as HTMLCanvasElement, {
            unsharpAmount: 80,
            unsharpRadius: 0.6,
            unsharpThreshold: 2
        });

        const targetQuality = (quality && quality > 0) ? quality / 100 : 1.0;
        const iterations = size ? 6 : 1;

        let low = 0.0;
        let high = targetQuality;
        let bestBlob: Blob | null = null;

        onProgress?.(Math.min(100, Math.round(++currentStep / (iterations + 1) * 100)));

        if (!size) {
            low = targetQuality;
            high = targetQuality;
        }

        for (let i = 0; i < iterations; i++) {
            const mid = Math.max(0.01, Math.min(1, (low + high) / 2));
            const blob = await targetCanvas.convertToBlob({
                type: "image/webp",
                quality: mid
            });

            onProgress?.(Math.min(100, Math.round((currentStep++ + i) / (iterations + 1) * 100)));

            if (!size || size <= 0) {
                bestBlob = blob;
                break;
            }

            if (blob.size <= size) {
                bestBlob = blob;
                low = mid;
            } else {
                high = mid;
            }
        }

        if (size && (!bestBlob || bestBlob.size > size)) {
            const extraShrink = 0.8;
            const smallCanvas = new OffscreenCanvas(
                Math.round(width * extraShrink),
                Math.round(height * extraShrink)
            );

            await picaInstance.resize(targetCanvas as unknown as HTMLCanvasElement, smallCanvas as unknown as HTMLCanvasElement);
            bestBlob = await smallCanvas.convertToBlob({ type: "image/webp", quality: 0.2 });
        }

        targetCanvas.width = 0;
        targetCanvas.height = 0;
        return bestBlob ?? null;
    } finally {
        bitmap.close();
    }
}

export async function compressGif({
    file,
    maxSize = undefined,
    maxDims = 480,
    quality = 100,
    cancelToken,
    onProgress
}: {
    file: File;
    maxSize?: number;
    maxDims?: number;
    quality?: number;
    cancelToken?: CancelToken;
    onProgress?: (progress: number) => void;
}): Promise<Blob | null> {

    if (!ffmpeg.loaded) {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
    }

    // clears out any files if any, from previous runs
    try {
        const files = await ffmpeg.listDir('/');
        for (const file of files) {
            const isUserFile = file.name.startsWith('in_') || file.name.startsWith('out_');
            if (!file.isDir && isUserFile) await ffmpeg.deleteFile(file.name);
        }
    } catch (e) {
        console.error("Error cleaning up ffmpeg dir: ", e);
    }

    const id = Math.random().toString(36).substring(7);
    const inName = `in_${id}_${file.name}`;
    const outName = `out_${id}.webp`;

    let low = 0;
    let high = quality;
    let bestBlob: Blob | null = null;
    let lastAttemptBlob: Blob | null = null;
    let currentIteration = 0;

    let compressionLevel = '3'; // Regular file: try balanced approaches
    if (file.size < 10 * 1024 * 1024) {
        compressionLevel = '5'; // Small file: try max compression
    } else if (file.size > 80 * 1024 * 1024) {
        compressionLevel = '1'; // Huge file: prioritize ram usage
    } else if (file.size > 40 * 1024 * 1024) {
        compressionLevel = '2'; // Large file: try for better quality than '1'
    }

    const size = (maxSize && maxSize > 10000) ? maxSize : undefined;
    const iterations = size ? 6 : 1;
    if (!size) {        // if no size limit, force the mid to be equal to the target quality
        low = quality;
        high = quality;
    }

    let progressHandler: ((e: { progress: number }) => void) | undefined;
    if (onProgress) {
        progressHandler = ({ progress }) => {
            onProgress(Math.min(100, Math.round((currentIteration + progress) / iterations * 100)));
        };
        ffmpeg.on("progress", progressHandler);
    }

    try {
        await ffmpeg.writeFile(inName, await fetchFile(file));

        for (let i = 0; i < iterations; i++) {
            if (cancelToken?.cancelled) break;

            currentIteration = i;
            const mid = Math.floor((low + high) / 2);
            await ffmpeg.exec([
                '-i', inName,
                '-vf', `scale='min(${maxDims},iw)':-1:force_original_aspect_ratio=decrease`,
                '-vcodec', 'libwebp',
                '-lossless', '0',
                '-compression_level', compressionLevel,
                '-q:v', `${mid}`,
                '-loop', '0',
                '-preset', 'picture',
                '-an',
                '-vsync', '0',     // maintain original frame timing
                // "-threads", "0",     // not sure if this helps...
                outName
            ]);

            const data = await ffmpeg.readFile(outName);
            // additional cast and check to silence typescript warnings
            if (typeof data === 'string') throw new Error("FFmpeg returned unexpected string data");
            const currentBlob = new Blob([data as BlobPart], { type: "image/webp" });

            if (!lastAttemptBlob || currentBlob.size < lastAttemptBlob.size) {
                lastAttemptBlob = currentBlob;
            }

            if (size && currentBlob.size > size) {
                high = mid - 1;
            } else {
                bestBlob = currentBlob;
                low = mid + 1;
            }

            await ffmpeg.deleteFile(outName);
            if (low > high) break;
        }

        await ffmpeg.deleteFile(inName);

        if (cancelToken?.cancelled) {
            console.warn("GIF compression cancelled");
            return null;
        }

        return bestBlob || lastAttemptBlob;

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isMemoryError =
            errorMessage.includes("memory access out of bounds") ||
            errorMessage.includes("RuntimeError") ||
            errorMessage.includes("memory");
        if (isMemoryError) {
            console.error("FFmpeg Fatal Error:", err);
            console.warn("Detected WASM Memory Crash. Resetting engine...");

            try {
                await ffmpeg.terminate();
            } catch { /* Worker might already be dead, that's fine */ }

            // Re-initialize instance
            ffmpeg = new FFmpeg();
            // Short delay to give browser time to actually clear RAM before loading new ffmpeg vm
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        try { await ffmpeg.deleteFile(inName); } catch { /* ignore */ }
        try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
        throw err;
    } finally {
        if (progressHandler) ffmpeg.off("progress", progressHandler);
    }
}

export async function uploadToS3(
    object: Blob | File,
    meta: UploadMeta
): Promise<boolean> {
    const contentType =
        meta.type === "text"
            ? "application/json"
            : object.type || "application/octet-stream";
    const res = await fetch(meta.url, {
        method: "PUT",
        headers: {
            "Content-Type": contentType,
        },
        body: object,
    });

    return res.ok;
};
