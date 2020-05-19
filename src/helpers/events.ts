import _ from "lodash";
import * as Phaser from "phaser";

import { UnknownFunction } from "./typing";
import { Maybe, string } from "purify-ts";
import { fromEvent, Observable } from "rxjs";

export type EventKey = string & {
  __eventKey: null;
};

export type WithRequiredEvent = {
  eventRequired?: EventKey;
};

export type ToObservable<T> = {
  observe(): Observable<T>;
};

export type EventDef<T> = {
  key: EventKey;
  selector: (...args: unknown[]) => T;
  observe: (emitter: Phaser.Events.EventEmitter) => Observable<T>;
};

export type EventDefHelper<
  BaseEventDef extends EventDef<unknown>
> = BaseEventDef extends EventDef<infer T>
  ? Omit<EventDef<T>, "observe"> & { observe: () => Observable<T> }
  : never;

type WithSelector = { selector: UnknownFunction };

type DefineEventsParams = { [Key: string]: UnknownFunction | WithSelector };

type ParamOfEvent<T> = T extends UnknownFunction
  ? Parameters<T>[0]
  : T extends WithSelector
  ? ReturnType<T["selector"]>
  : never;

export const defineEvents = <O extends DefineEventsParams>(data: O) =>
  _.mapValues(data, (value, key) => {
    const selector = Maybe.fromNullable(value)
      .map((v) => (v as WithSelector).selector)
      .orDefault(_.identity);
    return {
      key,
      selector,
      observe: (emitter) => fromEvent(emitter, key, selector),
    };
  }) as { [Key in keyof O]: EventDef<ParamOfEvent<O[Key]>> };

export type EventMappingDef = { [Key: string]: EventDef<unknown> };
