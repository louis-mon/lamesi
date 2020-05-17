import _ from "lodash";

type EventDef<F> = {
  key: string;
  f: F;
};
export const defineEvents = <O extends object>(data: O) =>
  _.mapValues(data, (value, key) => ({
    key,
  })) as { [Key in keyof O]: EventDef<O[Key]> };
