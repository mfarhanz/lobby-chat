import { useCallback, useEffect, useRef, useState } from "react";
import type { FileData } from "../types/chat";

export function useChatUpload() {
    const [uploads, setUploads] = useState<FileData[]>([]);
    const uploadsRef = useRef<FileData[]>([]);

    const cleanupPreviewUrls = useCallback(() => {
        uploadsRef.current.forEach(({ url }) => {
            if (url) URL.revokeObjectURL(url);
        });
    }, []);

    // cleanup on unmount
    useEffect(() => cleanupPreviewUrls, [cleanupPreviewUrls]);

    // keep ref in sync with state
    useEffect(() => {
        uploadsRef.current = uploads;
    }, [uploads]);

    return {
        uploads,
        setUploads,
        uploadsRef,
        cleanupPreviewUrls,
    };
}
