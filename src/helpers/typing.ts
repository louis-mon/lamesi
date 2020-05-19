export const annotate = <T>() => (null as unknown) as T;

export type ValueOf<T> = T[keyof T];

export type UnknownFunction = (...args: unknown[]) => unknown;
