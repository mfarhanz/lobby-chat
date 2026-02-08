import { useRef, useEffect, useCallback, memo } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data/sets/14/twitter.json";

type Props = {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    className?: string;
} & Partial<PickerProps>;

type PickerProps = React.ComponentProps<typeof Picker>;

export default memo(function EmojiPicker({ onSelect, onClose, className = "", ...pickerProps }: Props) {
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
            onClose();
        }
    }, [onClose]);

    const handleEmojiSelect = useCallback(
        (emoji: { native: string }) => {
            onSelect(emoji.native);
        },
        [onSelect]
    );

    // close when clicking outside
    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [handleClickOutside]);

    return (
        <div ref={wrapperRef} className={`emoji-picker-wrapper ${className}`}>
            <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="dark"
                navPosition="top"
                previewPosition="none"
                skinTonePosition="none"
                set="twitter"
                perLine={9}
                maxFrequentRows={2}
                emojiSize={30}
                emojiButtonSize={40}
                emojiButtonRadius="25%"
                emojiButtonColors={["rgba(0, 128, 255, 0.3)"]}
                {...pickerProps}
            />
        </div>
    );
});
