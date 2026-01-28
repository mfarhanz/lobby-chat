import { useRef, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data/sets/14/twitter.json";

type Props = {
    onSelect: (emoji: string) => void;
    onClose: () => void;
};

export function EmojiPicker({ onSelect, onClose }: Props) {
    const wrapperRef = useRef<HTMLDivElement>(null);

    // close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div ref={wrapperRef} className="emoji-picker-wrapper absolute bottom-full mb-2 right-0 w-auto">
            <Picker
                data={data}
                onEmojiSelect={(emoji: { native: string; }) => onSelect(emoji.native)}
                theme="dark"
                previewPosition="none"
                skinTonePosition="none"
                set="twitter"
                perLine={9}
                maxFrequentRows={3}
                emojiSize={30}
                emojiButtonSize={40}
            />
        </div>
    );
}
