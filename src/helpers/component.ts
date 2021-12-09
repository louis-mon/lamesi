import _ from "lodash";
import * as Phaser from "phaser";

import { UnknownFunction, annotate } from "./typing";
import { Observable, fromEvent, empty } from "rxjs";
import { startWith } from "rxjs/operators";
import { Maybe } from "purify-ts";
import { SceneContext } from "./phaser";
import { getProp } from "./functional";

type WithSelector = { selector: UnknownFunction };

export const customEvent = <T>() => ({ selector: (x: T) => x });

type DefineEventMappingParams = { [Key: string]: WithSelector };

export type MakeObservable<T> = SceneContext<Observable<T>>;
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

type ObjectKind = "go" | "scene" | "game" | "input";
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

type EventEmitterFactory = SceneContext<Phaser.Events.EventEmitter | null>;

const makeEventHelper = (emitterFactory: EventEmitterFactory) => <T>({
  key,
  selector,
}: { key: string } & WithSelector): EventHelper<T> => ({
  subject: (scene) =>
    Maybe.fromNullable(emitterFactory(scene)).mapOrDefault(
      (emitter) => fromEvent(emitter, key, selector),
      empty(),
    ),
  emit: (value) => (scene) =>
    Maybe.fromNullable(emitterFactory(scene)).ifJust((emitter) =>
      emitter.emit(key, value),
    ),
});

const sceneEmitterFactory: EventEmitterFactory = getProp("events");
export const makeSceneEventHelper = makeEventHelper(sceneEmitterFactory);

export const defineEvents = <
  O extends DefineEventMappingParams,
  Kind extends ObjectKind
>(
  data: O,
  kind: Kind,
) =>
  _.mapValues(data, (value, key) => {
    const impl = (
      emitterFactory: SceneContext<Phaser.Events.EventEmitter | null>,
    ) => makeEventHelper(emitterFactory)({ key, ...value });
    if (kind === "go") {
      return (id) => impl((scene) => scene.children.getByName(id));
    } else if (kind === "game") return impl((scene) => scene.game.events);
    else if (kind === "input") return impl((scene) => scene.input);
    else return impl(sceneEmitterFactory);
  }) as EventMappingDef<O, Kind>;

type DefineDataMappingParams = { [Key: string]: unknown };

type DataMappingDef<
  O extends DefineDataMappingParams,
  Kind extends ObjectKind
> = { [Key in keyof O]: HelperFactory<Kind, DataHelper<O[Key]>> };

export type DataMappingDefValues<
  T extends DataMappingDef<any, any>
> = T extends DataMappingDef<infer O, any> ? O : never;

const makeDataHelper = (
  emitterFactory: SceneContext<Maybe<Phaser.Events.EventEmitter>>,
  managerFactory: SceneContext<Maybe<Phaser.Data.DataManager>>,
) => <T>(key: string): DataHelper<T> => {
  const eventKey = `changedata-${key}`;
  const updateValue: DataHelper<T>["updateValue"] = (f) => (scene) => {
    return managerFactory(scene).ifJust((manager) =>
      manager.set(key, f(manager.get(key))),
    );
  };
  const value: DataHelper<T>["value"] = (scene) =>
    managerFactory(scene).mapOrDefault(
      (manager) => manager.get(key),
      undefined,
    );
  const subject: DataHelper<T>["subject"] = (scene) =>
    emitterFactory(scene).mapOrDefault(
      (emitter) => fromEvent(emitter, eventKey, (p, value) => value),
      empty(),
    );
  return {
    subject,
    dataSubject: (scene) => subject(scene).pipe(startWith(value(scene))),
    value,
    setValue: (v) => updateValue(() => v),
    updateValue,
  };
};

export const makeSceneDataHelper = makeDataHelper(
  (scene) => Maybe.of(scene.events),
  (scene) => Maybe.of(scene.data),
);

export const defineData = <
  O extends DefineDataMappingParams,
  Kind extends ObjectKind
>(
  data: O,
  kind: Kind,
) =>
  _.mapValues(data, (v, key) => {
    const impl = (
      emitterFactory: SceneContext<Maybe<Phaser.Events.EventEmitter>>,
      managerFactory: SceneContext<Maybe<Phaser.Data.DataManager>>,
    ) => makeDataHelper(emitterFactory, managerFactory)(key);
    if (kind === "go") {
      return (id) =>
        impl(
          (scene) => Maybe.fromNullable(scene.children.getByName(id)),
          (scene) =>
            Maybe.fromNullable(scene.children.getByName(id)).map((d) => d.data),
        );
    } else if (kind === "game")
      return impl(
        (scene) => Maybe.of(scene.game.events),
        (scene) => Maybe.of(scene.registry),
      );
    return makeSceneDataHelper(key);
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
  getObj: (id: string) => (scene: Phaser.Scene) => Cl;
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
  getObj: (key) => (scene) => scene.children.getByName(key) as Cl,
});

const defineGoClassKind = <Cl extends Phaser.GameObjects.GameObject>() => <
  Events extends DefineEventMappingParams,
  Data extends DefineDataMappingParams,
  Config extends object
>(p: {
  events: Events;
  data: Data;
  config?: Config;
}) => defineGoClass({ ...p, kind: annotate<Cl>() });

const defineDefaultGoClass = <Cl extends Phaser.GameObjects.GameObject>() =>
  defineGoClass({ events: {}, data: {}, kind: annotate<Cl>() });

export const defineGoSprite = defineGoClassKind<Phaser.GameObjects.Sprite>();
export const spriteClassKind = defineDefaultGoClass<
  Phaser.GameObjects.Sprite
>();

export const defineGoImage = defineGoClassKind<Phaser.GameObjects.Image>();

export const defineGoObject = defineGoClassKind();

export const physicsImageClassKind = defineDefaultGoClass<
  Phaser.Physics.Arcade.Image
>();
export const particleEmitterManagerClassKind = defineDefaultGoClass<
  Phaser.GameObjects.Particles.ParticleEmitterManager
>();

export const commonGoEvents = defineEvents(
  {
    pointerdown: customEvent(),
    animationcomplete: customEvent(),
  },
  "go",
);

export const observeCommonGoEvent = (
  go: Phaser.GameObjects.GameObject,
  event: keyof typeof commonGoEvents,
) => fromEvent(go, event);

export const declareGoInstance = <
  Cl extends Phaser.GameObjects.GameObject,
  Events extends DefineEventMappingParams,
  Data extends DefineDataMappingParams,
  Config extends object
>(
  goClass: GoClassDef<Cl, Events, Data, Config>,
  keyOrNull: string | null,
  config?: Config,
) => {
  const key = keyOrNull || _.uniqueId("go-unique");
  const getObj = goClass.getObj(key);
  return {
    config: config || ({} as Config),
    create: <SubCl extends Cl>(obj: SubCl) => {
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

export const commonInputEvents = defineEvents(
  {
    pointerdown: {
      selector: (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[],
      ) => ({ pointer, currentlyOver }),
    },
  },
  "input",
);
