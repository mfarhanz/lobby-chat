import { useRef, useCallback } from "react";
import { TOUCH_DEVICE } from "../utils/device";

interface UseLongPressProps {
    delay?: number;
    callback: () => void;
};

export function useLongPress({
    delay = 500,
    callback,
}: UseLongPressProps) {
    const timerRef = useRef<number | null>(null);

    const start = useCallback(() => {
        if (!TOUCH_DEVICE) return;

        timerRef.current = window.setTimeout(() => {
            callback();
        }, delay);
    }, [delay, callback]);

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    return {
        onTouchStart: start,
        onTouchEnd: cancel,
        onTouchMove: cancel,
        onTouchCancel: cancel,
    };
}
