export const annotate = <T>() => (undefined as unknown) as T;

export type ValueOf<T> = T[keyof T];

export type UnknownFunction = (...args: any[]) => any;
