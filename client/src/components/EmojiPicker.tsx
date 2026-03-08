import { useRef, useEffect, useCallback, memo } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data/sets/14/twitter.json";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { TOUCH_DEVICE } from "../utils/device";
import { EMOJI_BUTTON_SIZES, EMOJIS_PER_LINE } from "../constants/emoji";

type PickerProps = React.ComponentProps<typeof Picker>;

interface EmojiPickerProps extends Partial<PickerProps> {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    className?: string;
}

export default memo(function EmojiPicker({ onSelect, onClose, className = "", ...pickerProps }: EmojiPickerProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);

    const width = useWindowWidth();

    const handleClickOutside = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
            wrapperRef.current &&
            !wrapperRef.current.contains(target) &&
            !target.closest("[data-emoji-toggle]") &&
            !target.closest("[data-chat-send]") &&
            !target.closest("[data-upload-image]") && 
            !target.closest("[data-chat-input]")
        ) {
            onClose();
        }
    }, [onClose]);

    const handleEmojiSelect = useCallback(
        (emoji: { native: string }) => {
            onSelect(emoji.native);
        },
        [onSelect]
    );

    const perLine =
        TOUCH_DEVICE
            ? EMOJIS_PER_LINE.find(([bp]) => width >= bp)?.[1] ?? 6
            : 9;

    const emojiButtonSize =
        TOUCH_DEVICE
            ? (EMOJI_BUTTON_SIZES.find(([bp]) => width >= bp)?.[1] ?? 40)
            : 40;

    // close when clicking outside
    useEffect(() => {
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
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
                perLine={perLine}
                maxFrequentRows={3}
                emojiSize={30}
                emojiButtonSize={emojiButtonSize}
                emojiButtonRadius="25%"
                emojiButtonColors={["rgba(0, 128, 255, 0.3)"]}
                {...pickerProps}
            />
        </div>
    );
});
