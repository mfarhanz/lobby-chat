import "./App.css";
import { useEffect, useState } from "react";
import { Chat } from "./components/Chat";
import { UsersPanel } from "./components/UsersPanel";
// import { TurnstileOverlay } from "./components/TurnstileOverlay";
import { useChat } from "./hooks/useChat";

export default function App() {
    const {
        connected,
        userCount,
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
                    users={users.map(u => u.username)}
                    messages={messages}
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
                    messages={messages}
                    userCount={userCount}
                    mobileView={usersOpen}
                />
            </main>
        </div>
    );
}
