import * as Phaser from "phaser";
import { Observable, fromEvent } from "rxjs";
import _ from "lodash";
import { startWith } from "rxjs/operators";
import {
  ToObservable,
  EventMappingDef,
  EventDefHelper,
  EventDef,
} from "./events";

export type DataHelper<T, P = unknown> = ToObservable<T> & {
  setValue(value: T): void;
  value(): T;
  updateValue(f: (old: T) => T): void;
  onChange(f: (parent: P, value: T, previousValue: T) => void): void;
  onChangeOnce(f: (parent: P, value: T, previousValue: T) => void): void;
};

const genericDataHelper = <T, P>(
  emitter: Phaser.Events.EventEmitter,
  dataManager: Phaser.Data.DataManager,
  key: string,
): DataHelper<T, P> => ({
  setValue: (value: T) => dataManager.set(key, value),
  value: () => dataManager.get(key),
  updateValue: (f) => dataManager.set(key, f(dataManager.get(key))),
  onChange: (f) =>
    emitter.on(`changedata-${key}`, (parent: P, value: T, previousValue: T) =>
      f(parent, value, previousValue),
    ),
  onChangeOnce: (f) =>
    emitter.once(`changedata-${key}`, (parent: P, value: T, previousValue: T) =>
      f(parent, value, previousValue),
    ),
  observe: () =>
    fromEvent(emitter, `changedata-${key}`, (p, value) => value).pipe(
      startWith(dataManager.get(key)),
    ),
});

export function makeDataHelper<T>(
  go: Phaser.GameObjects.GameObject,
  key: string,
): DataHelper<T, Phaser.GameObjects.GameObject>;

export function makeDataHelper<T>(
  scene: Phaser.Scene,
  key: string,
): DataHelper<T, Phaser.GameObjects.GameObject>;

export function makeDataHelper<T>(o: any, key: string) {
  if (o instanceof Phaser.GameObjects.GameObject) {
    o.setDataEnabled();
    return genericDataHelper(o, o.data, key);
  } else if (o instanceof Phaser.Scene) {
    return genericDataHelper(o.events, o.data, key);
  }
}

/**
 * Defined keys and associated helpers to share typed declarations
 */
export const defineGoKeys = <O extends Phaser.GameObjects.GameObject>(
  key: string,
) => <Data extends object, Events extends EventMappingDef>({
  data,
  events,
}: {
  data?: Data;
  events?: Events;
}) => ({
  key,
  getObj: (scene: Phaser.Scene) => scene.children.getByName(key)! as O,
  data: _.mapValues(data, (value, dataKey) => (scene: Phaser.Scene) =>
    makeDataHelper(scene.children.getByName(key)!, dataKey),
  ) as { [key in keyof Data]: (scene: Phaser.Scene) => DataHelper<Data[key]> },
  events: _.mapValues(events, (value) => (scene: Phaser.Scene) =>
    ({
      ...value,
      observe: () => value.observe(scene.children.getByName(key)!),
    } as EventDefHelper<EventDef<unknown>>),
  ) as {
    [key in keyof Events]: (scene: Phaser.Scene) => EventDefHelper<Events[key]>;
  },
});
