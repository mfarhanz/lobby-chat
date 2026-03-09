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
import { UsernameModal } from "./UsernameModal";
import { useInactivityCheck } from "../hooks/useInactivityCheck";
import type { MessageActionData, FileData, MessageData, SendPayload, DrawerAction, PasteResult, UserIdentity } from "../types/chat";
import { AnimatePresence, motion } from "motion/react";
import { EmojiDrawer } from "./EmojiDrawer";
import { SendIcon } from "./icons/SendIcon";
import { KeyboardIcon } from "./icons/KeyboardIcon";

export interface ChatProps {
    user: UserIdentity | undefined,
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
    disconnectInactiveClient: () => void;
};

// lazy load the EmojiPicker
const EmojiPicker = lazy(() => import("./EmojiPicker"));

export const Chat = memo(function Chat({
    user,
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
    disconnectInactiveClient,
}: ChatProps) {
    const [input, setInput] = useState("");
    const [embed, setEmbed] = useState<string | null>(null);
    const [action, setAction] = useState<MessageActionData | null>(null);
    const [copyId, setCopydId] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const copyTimeoutRef = useRef<number | null>(null);
    const [usernameSubmitted, setUsernameSubmitted] = useState(false);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiPickerOpenId, setEmojiPickerOpenId] = useState<string | null>(null);

    const [drawerMessage, setDrawerMessage] = useState<MessageData | null>(null);

    const [chatHeight, setChatHeight] = useState(0);

    const messagesRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const outerRef = useRef<HTMLDivElement | null>(null);
    const rowRefs = useRef(new Map<string, HTMLDivElement>());
    const listRef = useRef<VariableSizeList>(null);
    const sizeMap = useRef(new Map<string, number>());

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

    const { submitUsername } = useTurnstile(startChat);

    useInactivityCheck({
        connected,
        onDisconnect: disconnectInactiveClient,
        sendLocalSystemMessage: sendLocalMessage
    });

    useEffect(() => {
        if (!embed) return;
        return () => URL.revokeObjectURL(embed);
    }, [embed]);

    // useEffect(() => {                                           // for reverting to copyicon from checkicon on copying message
    //     return () => {
    //         if (copyTimeoutRef.current) {
    //             clearTimeout(copyTimeoutRef.current);
    //         }
    //     };
    // }, []);

    useEffect(() => {                                           // catch pull to refresh/reload event to confirm
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };

        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);

    const scrollToListEndSmooth = useCallback(() => {
        const el = outerRef.current;
        if (!el) return;

        el.scrollTo({
            top: el.scrollHeight,
            behavior: "smooth",
        });
    }, [outerRef]);

    useEffect(() => {
        if (!lastId) return;

        const lastMessage = messages.get(lastId);
        if (isAtBottom.current) {
            scrollToListEndSmooth();
        } else if (lastMessage?.user.handle === user?.handle) {
            listRef.current?.scrollToItem(messageOrder.length - 1, "end");
        }
    }, [lastId, user]);    // ignore warning, do not add messages or messageOrder here!

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

    const getWindowItemSize = useCallback((index: number) => {
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
        textareaRef.current.style.height = "auto";  // reset textarea height
        if (!showEmojiPicker) textareaRef.current.focus();  // keep textarea focused only if emoji drawer not open
    }, [handleSend, showEmojiPicker, setEmbed, setUploads]);

    const pasteCallback = useCallback((result: PasteResult) => {
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
    }, [setUploads, setEmbed]);

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

    const { handlePaste } = usePaste({ callback: pasteCallback });

    const handleEmojiInputSelect = useCallback((emoji: string) => {
        setInput((v) => v + emoji);
    }, []);

    const handleEmojiInputClose = useCallback(() => {
        setShowEmojiPicker(false);
        if (window.history.state?.emojiDrawer) window.history.back();
    }, []);

    const handleEmojiButtonToggle = useCallback(() => {
        setTimeout(() => setShowEmojiPicker(v => !v), 100);
        if (showEmojiPicker) {
            setTimeout(() => textareaRef.current?.focus(), 120);
            if (!window.history.state?.emojiDrawer) {
                window.history.pushState({ emojiDrawer: true }, "");
            }
        }
        else textareaRef.current?.blur();
    }, [showEmojiPicker]);

    useEffect(() => {                                       // called when clicking the back button from open emoji drawer
        const handlePopState = () => {
            if (showEmojiPicker) handleEmojiInputClose();
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [showEmojiPicker, handleEmojiInputClose]);

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
        submitUsername(name);
        setUsernameSubmitted(true);
    }, [submitUsername]);

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
            // if (copyTimeoutRef.current) {
            //     clearTimeout(copyTimeoutRef.current);
            // }
            // copyTimeoutRef.current = window.setTimeout(() => {
            //     setCopydId(null);
            // }, 2000);
        }
    }, []);

    const onReplyMessage = useCallback((m: MessageData) => {
        setAction({
            type: "reply",
            userId: m.user,
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
            ...(drawerMessage.user.handle === user?.handle
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
    }, [user, drawerMessage, onReplyMessage, onCopyMessage, onEditMessage, onDeleteMessage, setEmojiPickerOpenId]);

    const itemData = useMemo(() => ({
        messages,
        messageOrder,
        user,
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
    }), [messages, messageOrder, user, today, copyId, emojiPickerOpenId, registerRef, scrollToMessage,
        onCopyMessage, onReplyMessage, onEditMessage, onDeleteMessage, addReaction, handleImageError, onLongPress]);


    ///////////////////////////////////////////TESTING///////////////////////////////////////////////////////////////////
    // console.log("Chat render");  // testing - this will print whenever chat re-renders
    // const prevRef = useRef<unknown>(null);
    // useEffect(() => {   // runs whenever chat rerenders
    //     if (prevRef.current === null) {
    //         console.log("First render");        // if this prints, object is still the same as original in memory
    //     } else if (prevRef.current !== deleteMessage) {
    //         console.log("Reference changed!");      // if this prints, object recreated anew every time in memory
    //     }
    //     prevRef.current = deleteMessage;       // if nothing prints, object is unchanged since initial creation
    // });
    /////////////////////////////////////////////TESTING/////////////////////////////////////////////////////////////////

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
                        itemSize={getWindowItemSize}
                        itemData={itemData}
                        overscanCount={1}
                        onScroll={({ scrollOffset }) => handleScroll(scrollOffset)}
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
                        <div className="absolute gap-2 py-0.5 bottom-full left-2 -right-9 -mb-px flex items-baseline 
                                        overflow-x-auto overflow-y-hidden whitespace-nowrap"
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
                            name={action.type === "reply" ? action.userId.name : undefined}
                            onClose={() => setAction(null)}
                        />
                    )}

                    {/* Chat input ping suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="chat-message-mention-list hide-scrollbar">
                            {suggestions.map((u) => (
                                <li
                                    key={u}
                                    className={`px-4 py-2 text-mention-sm cursor-pointer hover:bg-zinc-700/30`}
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
                        data-chat-input
                        ref={textareaRef}
                        className="chat-input"
                        value={input}
                        disabled={!connected}
                        placeholder="Type a message..."
                        rows={1}
                        onClick={() => {
                            if (showEmojiPicker) handleEmojiInputClose();
                        }}
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
                            data-emoji-toggle
                            icon={showEmojiPicker ? <KeyboardIcon /> : <EmojiIcon />}
                            title={showEmojiPicker ? "Keyboard" : "Emojis"}
                            className="sm:px-2"
                            onClick={handleEmojiButtonToggle}
                        />

                        <IconButton
                            data-upload-image
                            icon={<ImageIcon />}
                            title="Attach Media"
                            className="pl-2 sm:px-2"
                            disabled={!!embed}
                            onClick={() => fileInputRef.current?.click()}
                        />
                    </div>
                </div>

                <IconButton
                    data-chat-send
                    icon={<SendIcon />}
                    title="Send"
                    className="chat-send"
                    disabled={!connected}
                    onClick={onSend}
                />
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
            <AnimatePresence>
                {TOUCH_DEVICE && showEmojiPicker && (
                    <Suspense fallback={<Spinner />}>
                        <div className="relative overflow-hidden rounded-t-2xl bg-zinc-900 shadow-xl mt-4 h-60 w-full z-50">
                            <motion.div
                                drag="y"
                                dragConstraints={{ top: -180, bottom: 0 }}
                                dragElastic={0.08}
                                initial={{ y: 120 }}
                                animate={{ y: 0 }}
                                transition={{ type: "spring", stiffness: 600, damping: 35 }}
                            >
                                <EmojiPicker
                                    onSelect={handleEmojiInputSelect}
                                    onClose={handleEmojiInputClose}
                                    navPosition="none"
                                />
                            </motion.div>
                        </div>
                    </Suspense>
                )}
            </AnimatePresence>

            {/* Message Actions Drawer - for touchscreen only */}
            <AnimatePresence>
                {!!drawerMessage && (
                    <Drawer
                        actions={drawerActions}
                        onClose={handleCloseDrawer}
                    />
                )}
            </AnimatePresence>

            {/* Drawer Emoji Picker - for reactions on touchscreen only*/}
            <AnimatePresence>
                {TOUCH_DEVICE && emojiPickerOpenId && (
                    <EmojiDrawer
                        onClose={handleEmojiReactionClose}
                        onSelect={handleEmojiReactionSelect}
                    />
                )}
            </AnimatePresence>
        </section>
    );
}, (prev, next) => {  // additional strict comparator rule to only rerender the chat if messages state has changed and on socket connection
    return (
        prev.messages === next.messages &&
        prev.messageOrder === next.messageOrder &&
        prev.connected === next.connected
    );
});
