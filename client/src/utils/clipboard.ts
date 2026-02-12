export function getContent(item: DataTransferItem) {
    return new Promise<string>((resolve) => {
        item.getAsString(resolve);
    });
}

// TODO /////////
export function detectYouTube(text: string) {
    const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^\s&?]+)/i;
    const match = text.match(ytRegex);
    if (!match) return null;
    const videoId = match?.[1];
    if (videoId) {
        return {
            type: "youtube" as const,
            videoId,
            url: text,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        };
    }
}

// TODO /////////
export function detectSpotify(text: string) {
    if (!/open\.spotify\.com/i.test(text)) return null;
    return {
        type: "spotify" as const,
        url: text,
        thumbnail: "/spotify-placeholder.png",
    };
}

// TODO /////////
export function detectTwitter(text: string) {
    const lower = text.toLowerCase();
    if (
        !lower.includes("twitter.com") &&
        !lower.includes("x.com") &&
        !lower.includes("www.x.com")
    ) {
        return null;
    }
    return {
        type: "twitter" as const,
        url: text,
    };
}

// TODO /////////
export function detectGithub(text: string) {
    const match = text.match(
        /github\.com\/([^/\s]+)\/([^/\s#?]+)/i
    );

    if (!match) return null;

    return {
        type: "github" as const,
        url: text,
    };
}
