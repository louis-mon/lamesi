import * as Phaser from "phaser";

export type DataHelper<T, P = unknown> = {
  setValue(value: T): void;
  value(): T;
  onChange(
    f: (params: { parent: P; value: T; previousValue: T }) => void,
  ): void;
  onChangeOnce(
    f: (params: { parent: P; value: T; previousValue: T }) => void,
  ): void;
};

const genericDataHelper = <T, P>(
  emitter: Phaser.Events.EventEmitter,
  dataManager: Phaser.Data.DataManager,
  key: string,
): DataHelper<T, P> => ({
  setValue: (value: T) => dataManager.set(key, value),
  value: () => dataManager.get(key),
  onChange: (f) =>
    emitter.on(`changedata-${key}`, (parent: P, value: T, previousValue: T) =>
      f({ parent, value, previousValue }),
    ),
  onChangeOnce: (f) =>
    emitter.once(`changedata-${key}`, (parent: P, value: T, previousValue: T) =>
      f({ parent, value, previousValue }),
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
