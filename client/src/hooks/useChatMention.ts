import { useCallback, useState } from "react";
import { autoResize } from "../utils/textarea";
import { TOUCH_DEVICE } from "../utils/device";

interface UseChatMentionProps {
    users: string[];
    input: string;
    setInput: (value: string) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function useChatMention({ users, input, setInput, textareaRef }: UseChatMentionProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [chosenIndex, setChosenIndex] = useState(0);

    const selectSuggestion = useCallback((username: string) => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const cursorPos = textarea.selectionStart;
        const textBefore = input.slice(0, cursorPos);
        const textAfter = input.slice(cursorPos);

        // replace the last @word with the selected username
        const newTextBefore = textBefore.replace(/@(\w*)$/, `@${username} `);
        const newInput = newTextBefore + textAfter;

        setInput(newInput);

        // move cursor to right after inserted username
        const newCursorPos = newTextBefore.length;
        setTimeout(() => {
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);

        setShowSuggestions(false);
        setSuggestions([]);
    }, [input, textareaRef, setInput, setSuggestions, setShowSuggestions]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInput(value);
        autoResize(e);

        const cursorPos = e.target.selectionStart;
        const textUpToCursor = value.slice(0, cursorPos);

        const match = textUpToCursor.match(/@(\w*)$/);
        if (match) {
            const query = match[1].toLowerCase();
            const filtered = users.filter(u => u.toLowerCase().startsWith(query));
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
            setChosenIndex(0);
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    }, [users, setInput, setSuggestions, setShowSuggestions, setChosenIndex]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, onSubmit: () => void) => {
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                selectSuggestion(suggestions[chosenIndex]);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            if (!TOUCH_DEVICE) {
                e.preventDefault();
                onSubmit();
            }
        }
    }, [suggestions, selectSuggestion, showSuggestions, chosenIndex]);

    return {
        suggestions,
        showSuggestions,
        selectSuggestion,
        handleInputChange,
        handleKeyDown,
    };
}
