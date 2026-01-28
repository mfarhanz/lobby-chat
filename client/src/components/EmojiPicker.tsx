import { useRef, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data/sets/14/twitter.json";

type Props = {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    className?: string;
} & Partial<PickerProps>;

type PickerProps = React.ComponentProps<typeof Picker>;

export function EmojiPicker({ onSelect, onClose, className = "", ...pickerProps }: Props) {
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
        <div ref={wrapperRef} className={`emoji-picker-wrapper ${className}`}>
            <Picker
                data={data}
                onEmojiSelect={(emoji: { native: string; }) => onSelect(emoji.native)}
                theme="dark"
                navPosition="top"
                previewPosition="none"
                skinTonePosition="none"
                set="twitter"
                perLine={9}
                maxFrequentRows={5}
                emojiSize={30}
                emojiButtonSize={40}
                emojiButtonRadius="25%"
                emojiButtonColors={["rgba(0, 128, 255, 0.3)"]}
                {...pickerProps}
            />
        </div>
    );
}
