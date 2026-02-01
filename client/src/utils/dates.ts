export function formatTimestamp(ts: number, now: Date) {
    const date = new Date(ts);

    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const time = date.toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

    if (isSameDay(date, now)) {
        return `Today at ${time}`;
    }

    if (isSameDay(date, yesterday)) {
        return `Yesterday at ${time}`;
    }

    const fullDate = date.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
    });

    return `${fullDate} ${time}`;
}
