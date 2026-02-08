import { Chat } from "./components/Chat";
import { UsersPanel } from "./components/UsersPanel";
import { TurnstileOverlay } from "./components/TurnstileOverlay";
import { useChat } from "./hooks/useChat";
import "./App.css";
import { useEffect, useState } from "react";

export default function App() {
    const {
        connected,
        activeConnections,
        messages,
        users,
        username,
        startChat,
        sendMessage,
        editMessage,
        deleteMessage,
        addReaction,
    } = useChat();

    const [usersOpen, setUsersOpen] = useState(false);

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
            <TurnstileOverlay />

            <header
                className="app-header text-title"
                onClick={() => setUsersOpen(prev => !prev)}
            >
                Live Chat
            </header>

            <main className="app-main">
                <Chat
                    username={username}
                    users={users.map(u => u.username)}
                    messages={messages}
                    connected={connected}
                    activeConnections={activeConnections}
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
                    users={users}
                    messages={messages}
                    mobileView={usersOpen}
                />
            </main>
        </div>
    );
}
