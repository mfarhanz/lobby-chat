import { useCallback, useEffect, useRef, useState, lazy, Suspense, useMemo, memo, useLayoutEffect } from "react";
import { VariableSizeList } from 'react-window';
import { Thumbnail } from "./Thumbnail";
import { EmojiIcon } from "./icons/EmojiIcon";
import { ImageIcon } from "./icons/ImageIcon";
import { ChatWindow } from "./ChatWindow";
import { ChatActionBar } from "./ChatActionBar";
import { useChatUpload } from "../hooks/useChatUpload";
import { useChatMention } from "../hooks/useChatMention";
import { useCurrentDay } from "../hooks/useCurrentDay";
import { useTurnstile } from "../hooks/useTurnstile";
import { validateMedia } from "../utils/media";
import { PLACEHOLDER_IMG } from "../constants/chat";
import { useChatSend } from "../hooks/useChatSend";
import { IconButton } from "./IconButton";
import { EditIcon } from "./icons/EditIcon";
import { TrashIcon } from "./icons/TrashIcon";
import { CopyIcon } from "./icons/CopyIcon";
import { ReplyIcon } from "./icons/ReplyIcon";
import { ReactionIcon } from "./icons/ReactionIcon";
import { Drawer } from "./Drawer";
import { TOUCH_DEVICE } from "../utils/device";
import { Spinner } from "./Spinner";
import { usePaste } from "../hooks/usePaste";
import type { MessageActionData, FileData, MessageData, SendPayload, DrawerAction, PasteResult } from "../types/chat";
import { UsernameModal } from "./UsernameModal";
import { LocalMessages } from "../data/localMessages";

export interface ChatProps {
    username: string,
    users: string[],
    messages: Map<string, MessageData>;
    messageOrder: string[];
    connected: boolean;
    startChat: (token?: string) => void;
    sendMessage: (msg: SendPayload) => void;
    editMessage: (messageId: string, text: string) => void;
    deleteMessage: (messageId: string) => void;
    addReaction: (messageId: string, emoji: string) => void;
    sendLocalMessage: (text: string) => void;
};

// lazy load the EmojiPicker
const EmojiPicker = lazy(() => import("./EmojiPicker"));

export const Chat = memo(function Chat({
    username,
    users,
    messages,
    messageOrder,
    connected,
    startChat,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    sendLocalMessage,
}: ChatProps) {
    const [input, setInput] = useState("");
    const [embed, setEmbed] = useState<string | null>(null);
    const [action, setAction] = useState<MessageActionData | null>(null);
    const [copyId, setCopydId] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const copyTimeoutRef = useRef<number | null>(null);
    const [usernameSubmitted, setUsernameSubmitted] = useState(false);
    const [pickedUsername, setPickedUsername] = useState<string | null>(null);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiPickerOpenId, setEmojiPickerOpenId] = useState<string | null>(null);

    const [drawerMessage, setDrawerMessage] = useState<MessageData | null>(null);

    const [chatHeight, setChatHeight] = useState(0);

    const messagesRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const sizeMap = useRef(new Map<string, number>());
    const listRef = useRef<VariableSizeList>(null);
    const outerRef = useRef<HTMLDivElement | null>(null);
    const rowRefs = useRef(new Map<string, HTMLDivElement>());

    const isAtBottom = useRef(true);
    const scrollRafScheduled = useRef(false);
    const pendingScrollOffset = useRef<number | null>(null);
    // for batching height measurements per frame
    const measureRafScheduled = useRef(false);
    const pendingMeasurements = useRef<Array<{ msgId: string; index: number; el: HTMLDivElement }>>([]);
    const pendingResetIndex = useRef<number | null>(null);

    const today = useCurrentDay();
    const lastId = messageOrder.at(-1);  // message id of last sent message in chat

    const {
        uploads,
        setUploads,
        uploadsRef,
        cleanupPreviewUrls,
    } = useChatUpload();

    const {
        suggestions,
        showSuggestions,
        highlightedIndex,
        selectSuggestion,
        handleInputChange,
        handleKeyDown,
    } = useChatMention({ users, input, setInput, textareaRef });

    const {
        handleSend
    } = useChatSend({
        sendMessage,
        editMessage,
        cleanupPreviewUrls,
        uploadsRef,
        embed,
        input,
        setInput,
        action,
        setAction,
    });

    // console.log("Chat render");  // testing - this will print whenever chat re-renders
    // const prevRef = useRef<unknown>(null);
    // useEffect(() => {
    //     if (prevRef.current && prevRef.current !== deleteMessage) {
    //         console.log("deleteMessage CHANGED reference!");
    //     }
    //     prevRef.current = deleteMessage;
    // });

    useTurnstile(pickedUsername, startChat);

    useEffect(() => {
        if (!connected || !username) return;
        sendLocalMessage(LocalMessages.welcome(username));
    }, [connected, username, sendLocalMessage]);

    useEffect(() => {
        if (!embed) return;
        return () => URL.revokeObjectURL(embed);
    }, [embed]);

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    const scrollToListEndSmooth = () => {
        const el = outerRef.current;
        if (!el) return;

        el.scrollTo({
            top: el.scrollHeight,
            behavior: "smooth",
        });
    };

    useEffect(() => {
        if (!lastId) return;

        const lastMessage = messages.get(lastId);
        if (isAtBottom.current) {
            scrollToListEndSmooth();
        } else if (lastMessage?.user === username) {
            listRef.current?.scrollToItem(messageOrder.length - 1, "end");
        }
    }, [lastId, username]);    // ignore warning, do not add messages or messageOrder here!

    useLayoutEffect(() => {
        if (!messagesRef.current) return;

        const el = messagesRef.current;
        const observer = new ResizeObserver(() => {
            setChatHeight(el.clientHeight);
        });

        observer.observe(el);
        setChatHeight(el.clientHeight);
        return () => observer.disconnect();
    }, []);

    // 'unthrottled' version - not sure if throttled version makes a difference
    // const handleScroll = useCallback((scrollOffset: number) => {     // even if this is called a shitload, its actually still fine
    //     if (scrollTick.current) return;
    //     scrollTick.current = true;

    //     requestAnimationFrame(() => {
    //         const el = outerRef.current;
    //         if (!el) {
    //             scrollTick.current = false;
    //             return;
    //         }

    //         const { scrollHeight, clientHeight } = el;
    //         isAtBottom.current = scrollHeight - scrollOffset <= clientHeight + 10;
    //         scrollTick.current = false;
    //     });
    // }, []);

    const getSize = useCallback((index: number) => {
        const id = messageOrder[index];
        return sizeMap.current.get(id) ?? 83; // TODO: change hardcoded value later
    }, [messageOrder]);

    const messageIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        messageOrder.forEach((id, i) => map.set(id, i));
        return map;
    }, [messageOrder]);

    const scrollToMessage = useCallback((id: string) => {
        const index = messageIndexMap.get(id);
        if (index != null) listRef.current?.scrollToItem(index, "center");
    }, [messageIndexMap]);

    const registerRef = useCallback(
        (msgId: string, index: number) =>
            (el: HTMLDivElement | null) => {
                if (!el) {
                    rowRefs.current.delete(msgId);
                    return;
                }

                rowRefs.current.set(msgId, el);
                pendingMeasurements.current.push({ msgId, index, el });

                if (measureRafScheduled.current) return;
                measureRafScheduled.current = true;

                requestAnimationFrame(() => {
                    // Measuring all queued rows in this frame
                    for (const { msgId, index, el } of pendingMeasurements.current) {
                        const h = el.getBoundingClientRect().height;
                        const old = sizeMap.current.get(msgId);

                        if (old !== h) {
                            sizeMap.current.set(msgId, h);

                            // Track smallest index needing reset
                            if (pendingResetIndex.current === null || index < pendingResetIndex.current)
                                pendingResetIndex.current = index;
                        }
                    }

                    // Single resetAfterIndex per frame
                    if (pendingResetIndex.current != null) {
                        listRef.current?.resetAfterIndex(pendingResetIndex.current, true);
                    }

                    // cleanup
                    pendingMeasurements.current = [];
                    pendingResetIndex.current = null;
                    measureRafScheduled.current = false;
                });
            },
        []
    );

    const onSend = useCallback(async () => {
        if (!textareaRef.current) return;
        await handleSend();

        // reset local states
        setEmbed(null);
        setUploads([]);
        // reset textarea height
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    }, [handleSend, setEmbed, setUploads]);

    const { handlePaste } = usePaste({
        callback: (result: PasteResult) => {
            if (result) {
                switch (result.type) {
                    case "image":
                        if (result.file) {          // if its a local file on device that was pasted
                            setUploads(prev => {
                                const combined: FileData[] = [
                                    ...prev,
                                    ...(result.file ? [{ file: result.file, url: result.url }] : [])
                                ];
                                return combined.slice(0, 4);
                            });
                        } else setEmbed(result.url);
                        break;
                    case "youtube":
                        console.log("youtube URL detected:", result);
                        break;
                    case "spotify":
                        console.log("spotify URL detected:", result);
                        break;
                    case "twitter":
                        console.log("twitter URL detected:", result);
                        break;
                    case "github":
                        console.log("github URL detected:", result);
                        break;
                    default:
                        console.log("Error pasting content: ", result);
                }
            }
            else {
                console.log("Normal text pasted", result);
            }
        }
    });

    // throttled onScroll internal handler
    const handleScroll = useCallback((scrollOffset: number) => {
        pendingScrollOffset.current = scrollOffset;

        if (scrollRafScheduled.current) return;
        scrollRafScheduled.current = true;

        requestAnimationFrame(() => {
            const el = outerRef.current;
            if (!el || pendingScrollOffset.current == null) {
                scrollRafScheduled.current = false;
                return;
            }

            const { scrollHeight, clientHeight } = el;
            const offset = pendingScrollOffset.current;

            isAtBottom.current = scrollHeight - offset <= clientHeight + 10;

            scrollRafScheduled.current = false;
        });
    }, []);

    const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;

        const newPreviews = await Promise.all(files.map(async (file) => {
            const url = URL.createObjectURL(file);
            const result = await validateMedia(url, file);
            if (!result.ok) {
                URL.revokeObjectURL(url);
                return null; // skip invalid
            }
            return { file, url };
        }));

        setUploads(prev => {
            const combined = [...prev, ...newPreviews.filter((x): x is FileData => x !== null)];
            return combined.slice(0, 4);
        });

        e.target.value = "";
    }, [setUploads]);

    const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const el = e.currentTarget;
        if (el.src !== PLACEHOLDER_IMG) {
            el.src = PLACEHOLDER_IMG;
            el.alt = "Could not display image";
            el.title = "Could not display image";
        }
    }, []);

    const handleEmojiInputSelect = useCallback((emoji: string) => {
        setInput((v) => v + emoji);
    }, []);

    const handleEmojiInputClose = useCallback(() => {
        setShowEmojiPicker(false);
    }, []);

    const handleEmojiReactionSelect = useCallback((emoji: string) => {
        if (emojiPickerOpenId) {
            addReaction(emojiPickerOpenId, emoji);
            setEmojiPickerOpenId(null);
        }
    }, [emojiPickerOpenId, addReaction, setEmojiPickerOpenId]);

    const handleEmojiReactionClose = useCallback(() => {
        setEmojiPickerOpenId(null)
    }, []);

    const handleCloseDrawer = useCallback(() => {
        setDrawerMessage(null);
    }, []);

    const handleUsernameSubmit = useCallback((name: string | null) => {
        setPickedUsername(name);
        setUsernameSubmitted(true);
    }, []);

    const onLongPress = useCallback((msg: MessageData) => {
        if (TOUCH_DEVICE) setDrawerMessage(msg);
    }, []);

    const onEditMessage = useCallback((m: MessageData) => {
        setAction({ type: "edit", messageId: m.id });
        setInput(m.text);
        textareaRef.current?.focus();
    }, []);

    const onCopyMessage = useCallback((m: MessageData) => {
        navigator.clipboard.writeText(m.text);
        if (!TOUCH_DEVICE) {
            setCopydId(m.id);
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
            copyTimeoutRef.current = window.setTimeout(() => {
                setCopydId(null);
            }, 2000);
        }
    }, []);

    const onReplyMessage = useCallback((m: MessageData) => {
        setAction({
            type: "reply",
            name: m.user,
            messageId: m.id,
        });
        textareaRef.current?.focus();
    }, []);

    const onDeleteMessage = useCallback((m: MessageData) => {
        const index = messageOrder.indexOf(m.id);
        sizeMap.current.delete(m.id);
        rowRefs.current.delete(m.id);
        deleteMessage(m.id);
        requestAnimationFrame(() => {
            listRef.current?.resetAfterIndex(Math.max(0, index - 1), true);
        });
    }, [messageOrder, deleteMessage]);

    const drawerActions = useMemo<DrawerAction[]>(() => {
        if (!drawerMessage) return [];
        return [
            {
                key: "reaction",
                label: "Add reaction",
                icon: <ReactionIcon />,
                onPress: () => {
                    setEmojiPickerOpenId(drawerMessage.id);
                    setDrawerMessage(null);
                },
            },
            {
                key: "reply",
                label: "Reply",
                icon: <ReplyIcon />,
                onPress: () => {
                    onReplyMessage(drawerMessage);
                    setDrawerMessage(null);
                },
            },
            {
                key: "copy",
                label: "Copy",
                icon: <CopyIcon />,
                onPress: () => {
                    onCopyMessage(drawerMessage);
                    setDrawerMessage(null);
                },
            },
            ...(drawerMessage.user === username
                ? [
                    {
                        key: "edit",
                        label: "Edit",
                        icon: <EditIcon />,
                        onPress: () => {
                            onEditMessage(drawerMessage);
                            setDrawerMessage(null);
                        },
                    },
                    {
                        key: "delete",
                        label: "Delete",
                        icon: <TrashIcon />,
                        destructive: true,
                        onPress: () => {
                            onDeleteMessage(drawerMessage);
                            setDrawerMessage(null);
                        },
                    },
                ]
                : []),
        ];
    }, [username, drawerMessage, onReplyMessage, onCopyMessage, onEditMessage, onDeleteMessage, setEmojiPickerOpenId]);

    const itemData = useMemo(() => ({
        messages,
        messageOrder,
        username,
        today,
        copyId,
        emojiPickerOpenId,
        registerRef,
        scrollToMessage,
        sizeMap,
        listRef,
        rowRefs,
        handlers: {
            onCopy: onCopyMessage,
            onReply: onReplyMessage,
            onEdit: onEditMessage,
            onDelete: onDeleteMessage,
            onAddReaction: addReaction,
            onImageClick: setActiveImage,
            onImageError: handleImageError,
            onSetEmojiPickerOpenId: setEmojiPickerOpenId,
            onLongPressMessage: onLongPress,
        }
    }), [messages, messageOrder, username, today, copyId, emojiPickerOpenId, registerRef, scrollToMessage,
        onCopyMessage, onReplyMessage, onEditMessage, onDeleteMessage, addReaction, handleImageError, onLongPress]);

    return (
        <section className="chat-panel">
            {/* Username selection modal */}
            {!usernameSubmitted &&
                <UsernameModal onSubmit={handleUsernameSubmit} />
            }

            {/* Messages area/window */}
            <div
                ref={messagesRef}
                className="chat-messages "
            >
                {chatHeight > 0 && (
                    <VariableSizeList
                        ref={listRef}
                        outerRef={outerRef}
                        height={chatHeight}
                        width="100%"
                        className="scrollbar-custom"
                        itemCount={messageOrder.length}
                        itemSize={getSize}
                        itemData={itemData}
                        overscanCount={1}
                        onScroll={({ scrollOffset }) => handleScroll(scrollOffset)}
                    // onItemsRendered={({ visibleStartIndex, visibleStopIndex }) => {
                    //     console.log("Visible items:", visibleStopIndex - visibleStartIndex + 1);
                    // }}
                    >
                        {ChatWindow}
                    </VariableSizeList>
                )}
            </div>

            {/* Chat Input area */}
            <div className="chat-input-row">
                <div className="chat-input-wrapper">

                    {/* Media preview row */}
                    {(embed || uploads.length > 0) && (
                        <div className="absolute bottom-full left-2 -mb-px flex items-baseline gap-2 py-0.5"
                        >
                            {embed && (
                                <Thumbnail
                                    src={embed}
                                    onRemove={() => setEmbed(null)}
                                />
                            )}

                            {uploads.map(({ url }, index) => (
                                <Thumbnail
                                    key={url}
                                    src={url}
                                    onRemove={() => {
                                        URL.revokeObjectURL(url);
                                        setUploads(prev => prev.filter((_, i) => i !== index));
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Chat Action indicator row */}
                    {action && (
                        <ChatActionBar
                            type={action.type}
                            name={action.type === "reply" ? action.name : undefined}
                            onClose={() => setAction(null)}
                        />
                    )}

                    {/* Chat input ping suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="chat-message-mention-list hide-scrollbar">
                            {suggestions.map((u, i) => (
                                <li
                                    key={u}
                                    className={`px-4 py-2 text-mention-sm cursor-pointer 
                                                ${i === highlightedIndex ? "bg-zinc-700/30" : ""} 
                                                hover:bg-zinc-700/30`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectSuggestion(u);
                                    }}
                                >
                                    {u}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Chat Input */}
                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        value={input}
                        disabled={!connected}
                        placeholder="Type a message..."
                        rows={1}
                        onChange={handleInputChange}
                        onKeyDown={(e) => handleKeyDown(e, onSend)}
                        onPaste={handlePaste}
                    />

                    {/* Chat input emoji picker */}
                    {!TOUCH_DEVICE && showEmojiPicker && (
                        <Suspense fallback={<Spinner />}>
                            <>
                                <div className="absolute bottom-full mb-2 right-0 w-auto">
                                    <EmojiPicker
                                        onSelect={handleEmojiInputSelect}
                                        onClose={handleEmojiInputClose}
                                    />
                                </div>
                            </>
                        </Suspense>
                    )}

                    {/* Media file explorer */}
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                    />

                    {/* Chat Input buttons */}
                    <div className="chat-input-btn-group">
                        <IconButton
                            icon={<EmojiIcon />}
                            title="Emojis"
                            className="px-2"
                            onClick={() => setShowEmojiPicker((v) => !v)}
                        />

                        <IconButton
                            icon={<ImageIcon />}
                            title="Attach Media"
                            className="px-2"
                            disabled={!!embed}
                            onClick={() => fileInputRef.current?.click()}
                        />
                    </div>
                </div>

                <button
                    className="chat-send"
                    disabled={!connected}
                    onClick={onSend}
                >
                    ➤
                </button>
            </div>

            {/* Image View Popup - on clicking any media */}
            {activeImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80
                   flex items-center justify-center"
                    onClick={() => setActiveImage(null)}
                >
                    <img
                        src={activeImage}
                        alt="full size"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Chat input emoji picker - mobile only */}
            {TOUCH_DEVICE && showEmojiPicker && (
                <Suspense fallback={<Spinner />}>
                    <div className="flex justify-center mt-2 mb-2 animate-slide-up">
                        <div className="w-screen rounded-t-2xl bg-zinc-900">
                            <EmojiPicker
                                onSelect={handleEmojiInputSelect}
                                onClose={handleEmojiInputClose}
                                navPosition="none"
                            />
                        </div>
                    </div>
                </Suspense>
            )}

            {/* Message Actions - for touchscreen only */}
            <Drawer
                open={!!drawerMessage}
                actions={drawerActions}
                onClose={handleCloseDrawer}
            />

            {/* Drawer Emoji Picker - for reactions on touchscreen only*/}
            {TOUCH_DEVICE && emojiPickerOpenId && (
                <Suspense fallback={<Spinner />}>
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40 bg-black/40"
                            onClick={() => setEmojiPickerOpenId(null)}
                        />

                        {/* Drawer */}
                        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-zinc-900 p-4 animate-slide-up">
                            <EmojiPicker
                                onSelect={handleEmojiReactionSelect}
                                onClose={handleEmojiReactionClose}
                                className="w-full"
                                navPosition="none"
                            />
                        </div>
                    </>
                </Suspense>
            )}
        </section>
    );
}, (prev, next) => {  // additional strict comparator rule to only rerender the chat if messages state has changed and on socket connection
    return (
        prev.messages === next.messages &&
        prev.messageOrder === next.messageOrder &&
        prev.connected === next.connected
    );
});
