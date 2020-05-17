import _ from "lodash";

export type EventKey = string & {
  __eventKey: null;
};

export type WithRequiredEvent = {
  eventRequired?: EventKey;
};

type EventDef<F> = {
  key: EventKey;
  f: F;
};
export const defineEvents = <O extends object>(data: O) =>
  _.mapValues(data, (value, key) => ({
    key,
  })) as { [Key in keyof O]: EventDef<O[Key]> };
