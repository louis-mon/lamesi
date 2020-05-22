import _ from "lodash";
import { unknown } from "purify-ts";

export type FuncOrConst<P, R> = R | ((p: P) => R);

export const funcOrConstValue = <P, R>(f: FuncOrConst<P, R>, p: P): R =>
  _.isFunction(f) ? f(p) : f;

export const combineContext = <C>(
  ...f: Array<(c: C) => unknown>
): ((c: C) => unknown) =>
  f.reduce((acc, f) => (c) => {
    acc(c);
    f(c);
  });
