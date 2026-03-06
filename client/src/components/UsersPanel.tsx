import { memo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { MobileIcon } from "./icons/MobileIcon";
import { ComputerIcon } from "./icons/ComputerIcon";
import type { UserMeta, SessionUserStatsMeta, UserIdentity } from "../types/chat";

export interface UserProps {
    user: UserIdentity | undefined;
    users: UserMeta[];
    userCount: number;
    userStats: React.RefObject<Record<string, SessionUserStatsMeta>>;
    mobileView: boolean;
};

export const UsersPanel = memo(function UsersPanel({
    user,
    users,
    userCount,
    userStats,
    mobileView,
}: UserProps) {
    const [activeUser, setActiveUser] = useState<{ id: string; joinedAt: number; } | null>(null);
    const [now, setNow] = useState<number>(() => Date.now());

    // console.log("Userpanel render"); // testing - this prints whenever panel re-renders

    function formatRelativeTime(timestamp: number, now: number): string {
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""}`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? "s" : ""}`;
    }

    function timeColor(timestamp: number, now: number) {
        const diffSeconds = (now - timestamp) / 1000;
        if (diffSeconds < 60) return "text-green-400";      // < 1 min
        if (diffSeconds < 3600) return "text-lime-500";    // < 1 hour
        if (diffSeconds < 14400) return "text-lime-200/80";    // < 4 hours
        if (diffSeconds < 86400) return "text-amber-400/60";   // < 24 hours
        return "";                                          // > 1 day
    }

    return (
        <aside className={`users-panel ${mobileView ? "mobile-open" : ""}`}>
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 hide-scrollbar">
                {users.map((u) => {
                    const expand = activeUser?.id === u.userHandle;
                    const stats = userStats.current?.[u.userHandle];
                    const messageCount = stats?.messageCount ?? 0;
                    const lastActive = stats?.lastActive ?? u.joinedAt;

                    return (
                        <div
                            key={u.userHandle}
                            className={`user-item cursor-pointer ${expand ? "expanded bg-zinc-700" : ""}`}
                            onClick={() => {
                                setNow(Date.now());
                                setActiveUser(
                                    expand ? null : { id: u.userHandle, joinedAt: u.joinedAt }
                                );
                            }}
                        >
                            {/* Username list item*/}
                            <div
                                className={`overflow-hidden wrap-break-word space-x-2 ${expand ? "text-lg" : "text-sm"} 
                                            ${u.userHandle === user?.handle ? "text-emerald-200" : ""} 
                                            transition-[font-size] duration-200 ease-out`}
                            >
                                <span>{u.username}</span>
                                <span
                                    className={`text-neutral-500 transition-opacity duration-300 ease-out 
                                                ${expand ? "opacity-100" : "opacity-0"}`}
                                >
                                    #{u.userCode}
                                </span>
                            </div>

                            {/* Expanded list item */}
                            <div className={`leading-tight ${expand ? "mt-2 text-[0.75rem]" : "text-[0rem]"}  
                                            text-zinc-400 transition-[font-size] duration-300 min-h-0 overflow-hidden`}>
                                <div>
                                    Joined the chat <span className={`${timeColor(u.joinedAt, now)}`}>
                                        {formatRelativeTime(u.joinedAt, now)}
                                    </span> ago
                                </div>
                                <div>
                                    Last active <span className={`${timeColor(lastActive, now)}`}>
                                        {formatRelativeTime(lastActive, now)}
                                    </span> ago
                                </div>
                                <div>
                                    Messages sent: <span className="text-indigo-400">{messageCount}</span>
                                </div>
                                <div className={`flex justify-end ${expand ? "scale-100" : "scale-0"} transition-transform duration-200`}>
                                    {u.device === "mobile" ? (
                                        <MobileIcon className="size-5 text-zinc-300" />
                                    ) : (
                                        <ComputerIcon className="size-5 text-zinc-300" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-auto rounded-full border-t border-zinc-700 text-zinc-400 bg-zinc-800/90 px-3 py-2">
                <span className="font-mono tracking-wider uppercase">
                    Users online: <span className="text-indigo-400 font-bold text text-lg">
                        <NumberFlow value={userCount} />
                    </span>
                </span>
            </div>
        </aside>
    );
});
