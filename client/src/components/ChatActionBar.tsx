import { CancelIcon } from "./icons/CancelIcon";

interface ChatActionBarProps {
    type: "reply" | "edit";
    name?: string;
    onClose: () => void;
};

export function ChatActionBar({ type, name, onClose }: ChatActionBarProps) {
    return (
        <div className="chat-action-bar">
            {type === "reply" ? (
                <span>
                    Replying to
                    <span className="text-mention-sm">
                        {name ?? "Anonymous"}
                    </span>
                </span>
            ) : (
                "Editing message"
            )}

            <button
                className="chat-action-bar-close floating-action-btn mb-1"
                onClick={onClose}
                title="Cancel"
            >
                <CancelIcon className="size-5" />
            </button>
        </div>
    );
}
