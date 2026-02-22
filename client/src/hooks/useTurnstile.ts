import { useEffect, useRef } from "react";

export function useTurnstile(username: string | null, startChat: (username?: string, token?: string) => void) {
  const rendered = useRef(false);

  useEffect(() => {
    if (!username || rendered.current) return;
    rendered.current = true;

    startChat(username, "dawdwd");   // temporary, just for dev

    // // @ts-expect-error injected by CF script
    // window.turnstile.render("#turnstile-container", {
    //   sitekey: "0x4AAAAAACJ_0HK2dEtgp0S_",
    //   size: "normal",
    //   theme: "light",
    //   callback: (token: string) => {
    //     setTimeout(() => {
    //       document.getElementById("turnstile-overlay")?.remove();
    //     }, 1000);

    //     startChat(username, token);
    //   },
    //   "error-callback": (err: unknown) => {
    //     console.error("Turnstile error:", err);
    //   },
    // });
  }, [startChat, username]);
}
