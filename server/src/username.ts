import { faker } from "@faker-js/faker";

function capitalize(word: string): string {
    if (!word) return "";
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

// function references
const C = capitalize;
const U = (word: string) => word.toUpperCase();

// map of formats
const map: Record<number, (n?: string, adj?: string, x?: number, adv?: string, v?: string, n2?: string) => string> = {
    0: (n, adj, x) => `${C(adj!)}${C(n!)}${x}`,
    1: (n, adj, x) => `${C(adj!)}-${C(n!)}-${x}`,
    2: (n, adj, x) => `${adj}-${n}${x}`,
    3: (n, adj, x) => `${adj}${n}`,
    4: (n, adj, x) => `${adj}_${n}_${x}`,
    5: (n, adj, x) => `${adj}_${n}${x}`,
    6: (n, adj, x) => `${U(adj!)}_${U(n!)}${x! < 100 ? x : x! % 100}`,
    7: (n, adj, x) => `${U(adj!)}${U(n!)}${x}`,
    8: (n, adj, x) => `${adj}${C(n!)}_${x}`,
    9: (_, adj, x, adv) => `${C(adv!)}${C(adj!)}${x}`,
    10: (n, adj, _, adv) => `${adv}_${adj}_${n}`,
    11: (n, adj, _, adv) => `${adv}${adj}${n}`,
    12: (n, _, x, __, ___, n2) => `${n}_of_${n2}${x}`,
    13: (n, _, __, ___, v) => `${C(v!)}The${C(n!)}`,
    14: (n, adj, x) => `The${C(adj!)}${C(n!)}${x}`,
    15: (n, _, x, __, ___, n2) => `${C(n!)}InThe${C(n2!)}${x}`,
    16: (n, _, x, __, v) => `I${C(v!)}${C(n!)}s${x}`,
};

export function generateUsername(): string {
    const adjective = faker.word.adjective();
    const noun = faker.word.noun();
    const noun2 = faker.word.noun();
    const verb = faker.word.verb();
    const adverb = faker.word.adverb();
    const number = faker.number.int({ min: 1, max: 9999 });
    const format = Math.floor(Math.random() * Object.keys(map).length);
    return map[format](noun, adjective, number, adverb, verb, noun2);
}
