import _ from "lodash";
import { unknown, string } from "purify-ts";

export type FuncOrConst<P, R> = R | ((p: P) => R);

export const funcOrConstValue = <P, R>(p: P, f: FuncOrConst<P, R>): R =>
  _.isFunction(f) ? f(p) : f;

export const combineContext = <C>(
  ...f: Array<(c: C) => unknown>
): ((c: C) => unknown) =>
  f.reduce((acc, f) => (c) => {
    acc(c);
    f(c);
  });

export const getProp = <T, P extends keyof T>(prop: P): ((t: T) => T[P]) => (
  obj,
) => obj[prop];
