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
    v2?: string;
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

// map of username formats
const UserFormatMap: Record<number, (p: UserFormatMapParams) => string> = {
    0: ({ n, t, x }) => `${U(t!)}${U(n!)}${x}`,
    1: ({ n, adj, x }) => `${C(adj!)}-${C(n!)}-${x}`,
    2: ({ n, adj, x }) => `${adj}-${n}${x}`,
    3: ({ g, n, x }) => `${C(g!)}InThe${C(n!)}${x}`,
    4: ({ n, adj, x }) => `${adj}_${n}_${x}`,
    5: ({ n, v, x }) => `my_${n}_${v}s${x}`,
    6: ({ n, adj, x }) => `${U(adj!)}_${U(n!)}${x! < 100 ? x : x! % 100}`,
    7: ({ n, adj, x }) => `${U(adj!)}${U(n!)}${x}`,
    8: ({ n, x, n2 }) => `${n}_of_${n2}${x}`,
    9: ({ n, adj, x }) => `${C(adj!)}${C(n!)}${x}`,
    10: ({ n, adj, adv }) => `${adv}_${adj}_${n}`,
    11: ({ n, j }) => `${n}${j}4life`,
    12: ({ adj, x, adv }) => `${C(adv!)}${C(adj!)}${x}`,
    13: ({ g, j, x }) => `${g}4${j}s${x}`,
    14: ({ n, adj, x }) => `The${C(adj!)}${C(n!)}${x}`,
    15: ({ n, x, n2 }) => `${C(n!)}InThe${C(n2!)}${x}`,
    16: ({ n, x, v }) => `I${C(v!)}${C(n!)}s${x}`,
    17: ({ n, v }) => `DJ_${U(v!)}A${U(n!)}`,
    18: ({ n, adj, x }) => `ilike${adj}${n}s${x!%100}`,
    19: ({ n, n2, pp }) => `${C(n!)}${C(pp!)}My${C(n2!)}`,
    20: ({ v, j, x }) => `${U(v!)}THE${U(j!)}${x!%100}`,
    21: ({ n, adv, g, x }) => `${C(adv!)}${C(g!)}${C(n!)}${x!%100}`,
    22: ({ adj, adj2, x }) => `${C(adj!)}And${C(adj2!)}${x}`,
    23: ({ n, pp, x }) => `${pp}_in_the_${n}${x}`,
    24: ({ adv, pp, n }) => `${C(adv!)}${C(pp!)}${C(n!)}`,
    25: ({ n, g, x }) => `my${n}is${g}${x}`,
    26: ({ n, j, x }) => `${C(j!)}_of_${C(n!)}s${x!%100}`,
    27: ({ n, adj, x }) => `${adj}${C(n!)}_${x}`,
    28: ({ n, t, j }) => `${C(t!)}${C(n!)}${C(j!)}`,
    29: ({ adj, n, j }) => `${adj}${n}${j}`,
    30: ({ n, v }) => `${C(v!)}The${C(n!)}`,
    31: ({ v, v2, x }) => `BORN2${v}FORCED2${v2}${x}`,
    32: ({ n, pp, x }) => `my_${n}s_got_${pp}${x}`,
    33: ({ n, adj, adv }) => `${adv}${adj}${n}`,
    34: ({ n, adj, x }) => `${adj}${n}${x! % 100}`,
    35: ({ n, adj, x }) => `${adj}_${n}${x}`,
};

export function generateUsername(): string {
    const noun = faker.word.noun();
    const noun2 = faker.word.noun();
    const verb = faker.word.verb();
    const verb2 = faker.word.verb();
    const adverb = faker.word.adverb();
    const adjective = faker.word.adjective();
    const adjective2 = faker.word.adjective();
    const gerund = randomItem(getWordsWithPrefix(faker.definitions.word.noun, "ing")
                                .concat(getWordsWithPrefix(faker.definitions.word.adjective, "ing")));
    const pastParticiple = randomItem(getWordsWithPrefix(faker.definitions.word.adjective, "ed")
                                .concat(getWordsWithPrefix(faker.definitions.word.adjective, "en")));
    const job = randomItem(faker.definitions.person.job_type);
    const title = randomItem(faker.definitions.person.job_descriptor);
    const number = faker.number.int({ min: 1, max: 9999 });
    const format = +randomItem(Object.keys(UserFormatMap))!;
    return UserFormatMap[format]({
        n: noun,
        n2: noun2,
        v: verb,
        v2: verb2,
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
