import { CancelIcon } from "./icons/CancelIcon";

type Props = {
    type: "reply" | "edit";
    name?: string;
    onClose: () => void;
};

export function ChatActionBar({ type, name, onClose }: Props) {
    return (
        <div
            className="chat-action-bar"
        >
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
