import "./App.css";
import { useEffect, useMemo, useState } from "react";
import { Chat } from "./components/Chat";
import { UsersPanel } from "./components/UsersPanel";
// import { TurnstileOverlay } from "./components/TurnstileOverlay";
import { useChat } from "./hooks/useChat";

export default function App() {
    const {
        connected,
        userCount,
        userStats,
        users,
        username,
        messages,
        messageOrder,
        startChat,
        sendMessage,
        editMessage,
        deleteMessage,
        addReaction,
    } = useChat();

    const [usersOpen, setUsersOpen] = useState(false);

    const usernames = useMemo(
        () => users.map(u => u.username),
        [users]
    );

    useEffect(() => {
        if (!usersOpen) return;

        window.history.pushState({ usersPanel: true }, "");

        const onPopState = () => {
            setUsersOpen(false);
        };

        window.addEventListener("popstate", onPopState);

        return () => {
            window.removeEventListener("popstate", onPopState);
        };
    }, [usersOpen]);


    return (
        <div className="app-shell">
            {/* <TurnstileOverlay /> */}

            <header
                className="app-header text-title"
                onClick={() => setUsersOpen(prev => !prev)}
            >
                Live Chat
            </header>

            <main className="app-main">
                <Chat
                    username={username}
                    users={usernames}
                    messages={messages}
                    messageOrder={messageOrder}
                    connected={connected}
                    startChat={startChat}
                    sendMessage={sendMessage}
                    editMessage={editMessage}
                    deleteMessage={deleteMessage}
                    addReaction={addReaction}
                />

                {usersOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/40 md:hidden"
                        onClick={() => setUsersOpen(false)}
                    />
                )}

                <UsersPanel
                    username={username}
                    users={users}
                    userCount={userCount}
                    userStats={userStats}
                    mobileView={usersOpen}
                />
            </main>
        </div>
    );
}
