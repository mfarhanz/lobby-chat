import { useMemo, useState } from "react";
import { MobileIcon } from "./icons/MobileIcon";
import { ComputerIcon } from "./icons/ComputerIcon";
import type { MessageData, UserMeta } from "../types/chat";

export type Props = {
  users: UserMeta[];
  messages: MessageData[];
  mobileView: boolean;
};

export function UsersPanel({
    users,
    messages,
    mobileView,
}: Props) {
    const [activeUser, setActiveUser] = useState<{ username: string; joinedAt: number; } | null>(null);
    const [now, setNow] = useState<number>(() => Date.now());

    const userStats = useMemo(() => {
        const stats: Record<string, { count: number; lastActive: number }> = {};
        messages.forEach((msg) => {
            if (!stats[msg.user]) {
                stats[msg.user] = { count: 0, lastActive: msg.timestamp };
            }
            stats[msg.user].count += 1;
            stats[msg.user].lastActive = Math.max(stats[msg.user].lastActive, msg.timestamp);
        });
        return stats;
    }, [messages]);

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
            {users.map((user) => {
                const stats = userStats[user.username] ?? { count: 0, lastActive: user.joinedAt };

                return (
                    <div
                        key={user.username}
                        className={`
                            user-item cursor-pointer
                            transition-all duration-200 ease-out
                            ${activeUser?.username === user.username ? "expanded bg-zinc-700" : ""}
                        `}
                        onClick={() => {
                            setNow(Date.now());
                            setActiveUser(
                                activeUser?.username === user.username ? null : user
                            );
                        }}
                    >
                        {/* Username list item*/}
                        <div
                            className={`${activeUser?.username === user.username ? "text-lg" : "text-sm"}`}
                        >
                            {user.username}
                        </div>

                        {/* Expanded list item */}
                        {activeUser?.username === user.username && (
                            <div className="mt-2 text-xs text-zinc-400">
                                <div>
                                    Joined the chat <span className={`${timeColor(user.joinedAt, now)}`}>
                                        {formatRelativeTime(user.joinedAt, now)}
                                    </span> ago
                                </div>
                                <div>
                                    Last active <span className={`${timeColor(stats.lastActive, now)}`}>
                                        {formatRelativeTime(stats.lastActive, now)}
                                    </span> ago
                                </div>
                                <div>
                                    Messages sent: <span className="text-indigo-400">{stats.count}</span>
                                </div>
                                <div className="flex justify-end">
                                    {user.device === "mobile" ? (
                                        <MobileIcon className="size-5 text-zinc-300" />
                                    ) : (
                                        <ComputerIcon className="size-5 text-zinc-300" />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </aside>
    );
}
