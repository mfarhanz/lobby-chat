import { useCallback, useEffect, useRef, useState } from "react";

export function useTurnstile(startChat: (username?: string, token?: string) => void) {
    const rendered = useRef(false);
    const [token, setToken] = useState<string | null>(null);

    // render turnstile once, immediately
    useEffect(() => {
        if (rendered.current) return;
        rendered.current = true;

        const renderWidget = () => {
            // @ts-expect-error injected by CF script
            window.turnstile.render("#turnstile-container", {
                sitekey: "0x4AAAAAACJ_0HK2dEtgp0S_",
                size: "normal",
                theme: "light",
                callback: (t: string) => {
                    console.log("Turnstile passed:", t);
                    setTimeout(() => {
                        document.getElementById("turnstile-overlay")?.remove();
                    }, 1000);

                    setToken(t);
                },
                "error-callback": (err: unknown) => {
                    console.error("Turnstile error:", err);
                },
            });
        };

        renderWidget();
    }, []);

    // function to submit username once token exists and saved
    const submitUsername = useCallback(
        (username: string | null) => {
            if (!token) {
                alert("Please complete the verification first!");
                return;
            }
            startChat(username ?? undefined, token);
        },
        [token, startChat]
    );

    return { submitUsername, token };
}
