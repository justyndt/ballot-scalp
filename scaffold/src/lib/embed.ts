export const jsonIsland = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');
