import { useEffect, useRef } from "react";
import { INACTIVE_DISCONNECT_TIME, INACTIVE_WARNING_TIME, INACTIVE_CHECK_INTERVAL } from "../constants/chat";

interface UseInactivityCheckProps {
    connected: boolean;
    onDisconnect: () => void;
    sendLocalSystemMessage: (text: string) => void;
};

export function useInactivityCheck({
    connected,
    onDisconnect,
    sendLocalSystemMessage
}: UseInactivityCheckProps) {
    const lastActivityRef = useRef<number>(0);
    const hasWarnedRef = useRef<boolean>(false);

    function recordActivity() {
        lastActivityRef.current = Date.now();
        hasWarnedRef.current = false;
    }

    useEffect(() => {
        if (connected) lastActivityRef.current = Date.now();
    }, [connected]);

    useEffect(() => {
        if (!connected) return;

        const events = ["mousedown", "keydown", "touchstart", "scroll"];
        const handler = () => recordActivity();
        events.forEach(e => window.addEventListener(e, handler));

        return () => {
            events.forEach(e => window.removeEventListener(e, handler));
        };
    }, [connected]);

    useEffect(() => {
        if (!connected) return;

        const interval = setInterval(() => {
            const idleTime = Date.now() - lastActivityRef.current;

            if (idleTime >= INACTIVE_WARNING_TIME && !hasWarnedRef.current) {
                hasWarnedRef.current = true;
                sendLocalSystemMessage(
                    "You have been inactive for 25 minutes. You will be disconnected in **5 minutes** if no activity is detected."
                );
            }
            if (idleTime >= INACTIVE_DISCONNECT_TIME) {
                onDisconnect();
            }
        }, INACTIVE_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [connected, onDisconnect, sendLocalSystemMessage]);
}