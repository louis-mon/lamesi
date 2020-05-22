import _ from "lodash";
import * as Phaser from "phaser";

import { UnknownFunction, annotate } from "./typing";
import { Observable, fromEvent } from "rxjs";
import { startWith } from "rxjs/operators";

type WithSelector = { selector: UnknownFunction };

export const customEvent = <T>() => ({ selector: (x: T) => x });

type DefineEventMappingParams = { [Key: string]: WithSelector };

export type SceneContext<T> = (scene: Phaser.Scene) => T;
type MakeObservable<T> = SceneContext<Observable<T>>;
type EventHelper<T> = {
  subject: MakeObservable<T>;
  emit: (value: T) => SceneContext<void>;
};

type DataHelper<T> = {
  // Fires only when the value changes
  subject: MakeObservable<T>;
  // Fires with the initial value and on value changes
  dataSubject: MakeObservable<T>;
  value: SceneContext<T>;
  setValue: (value: T) => SceneContext<void>;
  updateValue: (f: (t: T) => T) => SceneContext<void>;
};

type ObjectKind = "go" | "scene" | "game";
type HelperFactory<kind extends ObjectKind, E> = "go" extends kind
  ? (key: string) => E
  : E;

export type EventMappingDef<
  O extends DefineEventMappingParams,
  Kind extends ObjectKind
> = {
  [Key in keyof O]: HelperFactory<
    Kind,
    EventHelper<ReturnType<O[Key]["selector"]>>
  >;
};

export const defineEvents = <
  O extends DefineEventMappingParams,
  Kind extends ObjectKind
>(
  data: O,
  kind: Kind,
) =>
  _.mapValues(data, (value, key) => {
    const impl = (
      emitter: SceneContext<Phaser.Events.EventEmitter>,
    ): EventHelper<unknown> => ({
      subject: (scene) => fromEvent(emitter(scene), key, value.selector),
      emit: (value) => (scene) => emitter(scene).emit(key, value),
    });
    if (kind === "go") {
      return (id) => impl((scene) => scene.children.getByName(id)!);
    } else if (kind === "game") impl((scene) => scene.game.events);
    return impl((scene) => scene.events);
  }) as EventMappingDef<O, Kind>;

type DefineDataMappingParams = { [Key: string]: unknown };

type DataMappingDef<
  O extends DefineDataMappingParams,
  Kind extends ObjectKind
> = { [Key in keyof O]: HelperFactory<Kind, DataHelper<O[Key]>> };

export const defineData = <
  O extends DefineDataMappingParams,
  Kind extends ObjectKind
>(
  data: O,
  kind: Kind,
) =>
  _.mapValues(data, (v, key) => {
    const eventKey = `changedata-${key}`;
    const impl = (
      emitter: SceneContext<Phaser.Events.EventEmitter>,
      managerFactory: SceneContext<Phaser.Data.DataManager>,
    ): DataHelper<unknown> => {
      const updateValue: DataHelper<unknown>["updateValue"] = (f) => (
        scene,
      ) => {
        const manager = managerFactory(scene);
        return manager.set(key, f(manager.get(key)));
      };
      const value: DataHelper<unknown>["value"] = (scene) =>
        managerFactory(scene).get(key);
      const subject: DataHelper<unknown>["subject"] = (scene) =>
        fromEvent(emitter(scene), eventKey, (p, value) => value);
      return {
        subject,
        dataSubject: (scene) => subject(scene).pipe(startWith(value(scene))),
        value,
        setValue: (v) => updateValue(() => v),
        updateValue,
      };
    };
    if (kind === "go") {
      return (id) =>
        impl(
          (scene) => scene.children.getByName(id)!,
          (scene) => scene.children.getByName(id)!.data,
        );
    } else if (kind === "game")
      return impl(
        (scene) => scene.game.events,
        (scene) => scene.registry,
      );
    return impl(
      (scene) => scene.events,
      (scene) => scene.data,
    );
  }) as DataMappingDef<O, Kind>;

type GoClassDef<
  Cl extends Phaser.GameObjects.GameObject,
  Events extends DefineEventMappingParams,
  Data extends DefineDataMappingParams,
  Config extends object
> = {
  kind?: Cl;
  events: EventMappingDef<Events, "go">;
  data: DataMappingDef<Data, "go">;
  config: Config;
};

export const defineGoClass = <
  Cl extends Phaser.GameObjects.GameObject,
  Events extends DefineEventMappingParams,
  Data extends DefineDataMappingParams,
  Config extends object
>({
  events,
  data,
  kind,
  config,
}: {
  events: Events;
  data: Data;
  kind?: Cl;
  config?: Config;
}): GoClassDef<Cl, Events, Data, Config> => ({
  kind,
  config: config || ({} as Config),
  events: defineEvents(events, "go"),
  data: defineData(data, "go"),
});

export const commonGoEvents = defineEvents(
  {
    pointerdown: customEvent(),
    animationcomplete: customEvent(),
  },
  "go",
);

export const declareGoInstance = <
  Cl extends Phaser.GameObjects.GameObject,
  Events extends DefineEventMappingParams,
  Data extends DefineDataMappingParams,
  Config extends object
>(
  goClass: GoClassDef<Cl, Events, Data, Config>,
  key: string,
  config?: Config,
) => {
  const getObj = (scene: Phaser.Scene) => scene.children.getByName(key)! as Cl;
  return {
    config: config || ({} as Config),
    create: (obj: Cl) => {
      if (!_.isEmpty(goClass.data)) obj.setDataEnabled();
      return obj.setName(key);
    },
    key,
    goClass,
    getObj,
    events: _.mapValues(goClass.events, (value) => value(key)) as {
      [Key in keyof Events]: EventHelper<ReturnType<Events[Key]["selector"]>>;
    },
    data: (_.mapValues(goClass.data, (value) => value(key)) as unknown) as {
      [Key in keyof Data]: DataHelper<Data[Key]>;
    },
  };
};

export const declareGoInstances = <
  Cl extends Phaser.GameObjects.GameObject,
  Events extends DefineEventMappingParams,
  Data extends DefineDataMappingParams,
  Config extends object,
  Mapping extends { [Key: string]: Config }
>(
  goClass: GoClassDef<Cl, Events, Data, Config>,
  prefix: string,
  mapping: Mapping,
) =>
  _.mapValues(mapping, (value, key) =>
    declareGoInstance(goClass, `${prefix}-${key}`, value),
  );

export const defineSceneClass = <
  Events extends DefineEventMappingParams,
  Data extends DefineDataMappingParams
>({
  data,
  events,
}: {
  events: Events;
  data: Data;
}) => ({
  events: defineEvents(events, "scene"),
  data: defineData(data, "scene"),
});
