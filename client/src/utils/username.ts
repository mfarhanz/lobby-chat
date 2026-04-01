import { faker } from "@faker-js/faker";

/**
 * Returns the capitalized version of the given word.
 */
function capitalize(word: string): string {
    if (!word) return "";
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
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
    adj?: string;
    adj2?: string;
    adv?: string;
    x?: number;
};

// function references (used in UserFormatMap)
const C = capitalize;
const U = (word: string) => word.toUpperCase();

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
    8: ({ n, adj, x }) => `The${C(adj!)}${C(n!)}${x}`,
    9: ({ adj, adj2, x }) => `${C(adj!)}And${C(adj2!)}${x}`,
    10: ({ n, adj, x }) => `${adj}${n}${x}`,
};

export function generateUsername(): string {
    const noun = faker.word.noun({ length: { min: 2, max: 12 }});
    const noun2 = faker.word.noun({ length: { min: 2, max: 12 }});
    const adverb = faker.word.adverb({ length: { min: 2, max: 9 }});
    const adjective = faker.word.adjective({ length: { min: 2, max: 9 }});
    const adjective2 = faker.word.adjective({ length: { min: 2, max: 9 }});
    const number = faker.number.int({ min: 1, max: 9999 });
    const format = +randomItem(Object.keys(UserFormatMap))!;

    return UserFormatMap[format]({
        n: noun,
        n2: noun2,
        adj: adjective,
        adj2: adjective2,
        adv: adverb,
        x: number,
    });

}

export function generateUsernameSet(count = 5) {
    return Array.from({ length: count }, generateUsername);
}
