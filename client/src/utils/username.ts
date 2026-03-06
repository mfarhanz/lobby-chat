import { faker } from "@faker-js/faker";

/**
 * Returns the capitalized version of the given word.
 */
function capitalize(word: string): string {
    if (!word) return "";
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Returns all strings ending with a given prefix from a string array.
 */
function getWordsWithPrefix(words: readonly string[], prefix: string): string[] {
    return words.filter(w => w.toLowerCase().endsWith(prefix));
}

/**
 * Returns a random item from an array.
 * Returns undefined if the array is empty.
 */
function randomItem<T>(arr: T[] | readonly T[]): T | undefined {
    if (arr.length === 0) return undefined;
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
}

type UserFormatMapParams = {
    n?: string;
    n2?: string;
    v?: string;
    adj?: string;
    adj2?: string;
    adv?: string;
    pp?: string;
    g?: string;
    j?: string;
    t?: string;
    x?: number;
};

// function references (used in UserFormatMap)
const C = capitalize;
const U = (word: string) => word.toUpperCase();
const L = (word: string) => word.toLowerCase();

// map of username formats
const UserFormatMap: Record<number, (p: UserFormatMapParams) => string> = {
    0: ({ n, adj, x }) => `${C(adj!)}-${C(n!)}${x}`,
    1: ({ n, adj, x }) => `${adj}-${n}${x}`,
    2: ({ n, adj, x }) => `${adj}_${n}_${x}`,
    3: ({ n, adj, x }) => `${U(adj!)}_${U(n!)}${x! % 100}`,
    4: ({ n, adj, x }) => `${U(adj!)}${U(n!)}${x}`,
    5: ({ n, x, n2 }) => `${n}_of_${n2}s${x}`,
    6: ({ n, adj, x }) => `${C(adj!)}${C(n!)}${x}`,
    7: ({ n, adj, adv }) => `${adv}_${adj}_${n}`,
    8: ({ adj, x, adv }) => `${C(adv!)}${C(adj!)}${x}`,
    9: ({ n, adj, x }) => `The${C(adj!)}${C(n!)}${x}`,
    10: ({ n, adj }) => `ilike${adj}${n}s`,
    11: ({ v, j, x }) => `${U(v!)}THE${U(j!)}${x! % 100}`,
    12: ({ n, adv, g }) => `${C(adv!)}${C(g!)}${C(n!)}`,
    13: ({ adj, adj2, x }) => `${C(adj!)}And${C(adj2!)}${x}`,
    14: ({ n, g, x }) => `my${n}is${g}${x}`,
    15: ({ n, j, x }) => `${C(j!)}_of_${C(n!)}s${x! % 100}`,
    16: ({ n, t, j }) => `${C(t!)}${C(n!)}${C(j!)}`,
    17: ({ adj, n, j }) => `${adj}${n}${L(j!)}`,
    18: ({ n, pp }) => `my_${n}_got_${pp}`,
    19: ({ n, g, x }) => `${C(g!)}${C(n!)}${x}`,
    20: ({ n, adj, adv }) => `${adv}${adj}${n}`,
    21: ({ n, adj, x }) => `${adj}${n}${x}`,
};

export function generateUsername(): string {
    const noun = faker.word.noun({ length: { min: 2, max: 12 }});
    const noun2 = faker.word.noun({ length: { min: 2, max: 12 }});
    const nouns = faker.definitions.word.noun.filter(w => w.length < 9);
    const verb = faker.word.verb({ length: { min: 2, max: 9 }});
    const adverb = faker.word.adverb({ length: { min: 2, max: 9 }});
    const adjective = faker.word.adjective({ length: { min: 2, max: 9 }});
    const adjective2 = faker.word.adjective({ length: { min: 2, max: 9 }});
    const adjectives = faker.definitions.word.adjective.filter(w => w.length < 9);
    const gerund = randomItem(getWordsWithPrefix(nouns, "ing").concat(getWordsWithPrefix(adjectives, "ing")));
    const pastParticiple = randomItem(getWordsWithPrefix(adjectives, "ed").concat(getWordsWithPrefix(adjectives, "en")));
    const job = randomItem(faker.definitions.person.job_type);
    const title = randomItem(faker.definitions.person.job_descriptor);
    const number = faker.number.int({ min: 1, max: 9999 });
    const format = +randomItem(Object.keys(UserFormatMap))!;

    return UserFormatMap[format]({
        n: noun,
        n2: noun2,
        v: verb,
        adj: adjective,
        adj2: adjective2,
        adv: adverb,
        pp: pastParticiple,
        g: gerund,
        j: job,
        t: title,
        x: number,
    });

}

export function generateUsernameSet(count = 5) {
    return Array.from({ length: count }, generateUsername);
}
