import { Chat } from "./components/Chat";
import { UsersPanel } from "./components/UsersPanel";
import { TurnstileOverlay } from "./components/TurnstileOverlay";
import { useChat } from "./hooks/useChat";
import "./App.css";

export default function App() {
  const {
    messages,
    users,
    activeConnections,
    connected,
    startChat,
    sendMessage,
  } = useChat();

  return (
    <div className="app-shell">
      <TurnstileOverlay />

      <header className="app-header text-title">
        Live Chat
      </header>

      <main className="app-main">
        <Chat
          messages={messages}
          connected={connected}
          activeConnections={activeConnections}
          startChat={startChat}
          sendMessage={sendMessage}
        />

        <UsersPanel users={users} />
      </main>
    </div>
  );
}
