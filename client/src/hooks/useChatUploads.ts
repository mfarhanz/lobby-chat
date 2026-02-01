import { useEffect, useRef, useState } from "react";
import type { ChatFile } from "../types/chat";

export function useChatUploads() {
  const [uploads, setUploads] = useState<ChatFile[]>([]);
  const uploadsRef = useRef<ChatFile[]>([]);

  const cleanupPreviewUrls = () => {
    uploadsRef.current.forEach(({ url }) => {
      URL.revokeObjectURL(url);
    });
  };

  // cleanup on unmount
  useEffect(() => cleanupPreviewUrls, []);

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
