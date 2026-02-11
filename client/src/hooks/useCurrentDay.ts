import { useEffect, useState } from "react";

export function useCurrentDay() {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const now = new Date();

        const nextMidnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0, 0, 0, 0
        );

        const timeout = setTimeout(() => {
            setNow(new Date()); // reset current day

            const interval = setInterval(() => {
                setNow(new Date());
            }, 24 * 60 * 60 * 1000);

            return () => clearInterval(interval);
        }, nextMidnight.getTime() - now.getTime());

        return () => clearTimeout(timeout);
    }, []);

    return now;
}
