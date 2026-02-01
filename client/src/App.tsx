import { Chat } from "./components/Chat";
import { UsersPanel } from "./components/UsersPanel";
import { TurnstileOverlay } from "./components/TurnstileOverlay";
import { useChat } from "./hooks/useChat";
import "./App.css";

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

  return (
    <div className="app-shell">
      <TurnstileOverlay />

      <header className="app-header text-title">
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

        <UsersPanel users={users} messages={messages} />
      </main>
    </div>
  );
}
