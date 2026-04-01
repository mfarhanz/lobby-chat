import "./App.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chat } from "./components/Chat";
import { UsersPanel } from "./components/UsersPanel";
import { TurnstileOverlay } from "./components/TurnstileOverlay";
import { useChat } from "./hooks/useChat";

export default function App() {
    const {
        connected,
        userCount,
        userStats,
        users,
        userId,
        messages,
        messageOrder,
        startChat,
        sendIntent,
        editMessage,
        deleteMessage,
        addReaction,
        sendLocalSystemMessage,
        disconnectInactive,
    } = useChat();

    const [usersOpen, setUsersOpen] = useState(false);
    const historyRef = useRef(false);

    const usernames = useMemo(
        () => users.map(u => u.username),
        [users]
    );

    useEffect(() => {
        const onPopState = () => {
            if (historyRef.current) {
                setUsersOpen(false);
                historyRef.current = false;
            }
        };

        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    const openUsersPanel = useCallback(() => {
        if (!historyRef.current) {
            window.history.pushState({ usersPanel: true }, "");
            historyRef.current = true;
        }
        setUsersOpen(true);
    }, []);

    return (
        <div className="app-shell">
            <TurnstileOverlay />

            <header
                className="app-header text-title"
                onClick={openUsersPanel}
            >
                Live Chat
            </header>

            <main className="app-main">
                <Chat
                    user={userId}
                    users={usernames}
                    messages={messages}
                    messageOrder={messageOrder}
                    connected={connected}
                    startChat={startChat}
                    sendIntent={sendIntent}
                    editMessage={editMessage}
                    deleteMessage={deleteMessage}
                    addReaction={addReaction}
                    sendLocalMessage={sendLocalSystemMessage}
                    disconnectInactiveClient={disconnectInactive}
                />

                {usersOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/40 md:hidden"
                        onClick={() => setUsersOpen(false)}
                    />
                )}

                <UsersPanel
                    user={userId}
                    users={users}
                    userCount={userCount}
                    userStats={userStats}
                    mobileView={usersOpen}
                />
            </main>
        </div>
    );
}
