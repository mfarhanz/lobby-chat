import { IconButton } from "./IconButton";
import { CancelIcon } from "./icons/CancelIcon";

interface ChatActionBarProps {
    type: "reply" | "edit";
    name?: string;
    onClose: () => void;
};

export function ChatActionBar({ type, name, onClose }: ChatActionBarProps) {
    return (
        <div className="chat-action-bar">
            <span className="min-w-0 truncate">
                {type === "reply" ? (
                    <>
                        Replying to{" "}
                        <span className="text-mention-sm">
                            {name ?? "Anonymous"}
                        </span>
                    </>
                ) : (
                    "Editing message"
                )}
            </span>

            <IconButton
                icon={<CancelIcon className="size-5" />}
                title={"Cancel"}
                className="text-xs mb-1 shrink-0"
                onClick={onClose}
            />
        </div>
    );
}
