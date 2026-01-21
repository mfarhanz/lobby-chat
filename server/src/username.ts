const ADJECTIVES = [
    "Curious", "Silent", "Swift", "Lazy", "Brave", "Cosmic", "Witty"
];

const NOUNS = [
    "Otter", "Raccoon", "Falcon", "Pineapple", "Wizard", "Turtle"
];

export function generateUsername(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj}${noun}`;
}
