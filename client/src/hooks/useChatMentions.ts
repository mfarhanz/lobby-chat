import { useState } from "react";
import { autoResize } from "../utils/textarea";

interface Props {
    users: string[];
    input: string;
    setInput: (value: string) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function useChatMentions({ users, input, setInput, textareaRef }: Props) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const selectSuggestion = (username: string) => {
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
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
            setHighlightedIndex(0);
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, onSubmit: () => void) => {
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((i) => (i === 0 ? suggestions.length - 1 : i - 1));
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                selectSuggestion(suggestions[highlightedIndex]);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    return {
        suggestions,
        showSuggestions,
        highlightedIndex,
        selectSuggestion,
        handleInputChange,
        handleKeyDown,
    };
}
