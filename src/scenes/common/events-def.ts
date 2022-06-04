import { globalData, GlobalDataKey } from "/src/scenes/common/global-data";
import { Scene } from "phaser";
import {
  creaturesSceneKey,
  dungeonSceneKey,
  hubSceneKey,
  lightsSceneKey,
} from "/src/scenes/common/constants";
import { compact, first, keys, pickBy } from "lodash";
import Vector2 = Phaser.Math.Vector2;

type CreateItem = (p: {
  pos: Vector2;
  scene: Scene;
}) => Phaser.GameObjects.Image;
type EventDef = {
  triggers: GlobalDataKey[];
  createItem: CreateItem;
  scene: string;
};

type EventsDef = {
  [data in GlobalDataKey]: EventDef;
};

const item =
  (key: string): CreateItem =>
  (p) =>
    p.scene.add.image(p.pos.x, p.pos.y, "items", key);
export const undefinedEventItem = item("");

export const eventsDef: EventsDef = {
  firstEvent: {
    triggers: ["lights1"],
    createItem: item("circle-gem"),
    scene: hubSceneKey,
  },
  lights1: {
    triggers: ["creatures1"],
    createItem: item("book"),
    scene: lightsSceneKey,
  },
  creatures1: {
    triggers: ["dungeonPhase1"],
    createItem: item("woman"),
    scene: creaturesSceneKey,
  },
  dungeonPhase1: {
    triggers: ["lights2"],
    createItem: item("drop"),
    scene: dungeonSceneKey,
  },
  lights2: {
    triggers: ["creatures4", "dungeonPhase2"],
    createItem: item("seeds"),
    scene: lightsSceneKey,
  },
  dungeonPhase2: {
    triggers: ["lights3"],
    createItem: item("tree"),
    scene: dungeonSceneKey,
  },
  lights3: {
    triggers: ["dungeonPhase3"],
    createItem: item("amulet"),
    scene: lightsSceneKey,
  },
  dungeonPhase3: {
    triggers: ["creatures3"],
    createItem: item("shell"),
    scene: dungeonSceneKey,
  },
  creatures4: {
    triggers: ["creatures4Done"],
    createItem: undefinedEventItem,
    scene: creaturesSceneKey,
  },
  creatures4Done: {
    triggers: [],
    createItem: undefinedEventItem,
    scene: creaturesSceneKey,
  },
  creatures3: {
    triggers: ["lights4"],
    createItem: undefinedEventItem,
    scene: creaturesSceneKey,
  },
  lights4: {
    triggers: ["dungeonPhase4"],
    createItem: undefinedEventItem,
    scene: lightsSceneKey,
  },
  dungeonPhase4: {
    triggers: ["creatures2"],
    createItem: undefinedEventItem,
    scene: dungeonSceneKey,
  },
  creatures2: {
    triggers: ["lights5", "dungeonPhase5"],
    createItem: undefinedEventItem,
    scene: creaturesSceneKey,
  },
  lights5: {
    triggers: ["lightsDone"],
    createItem: undefinedEventItem,
    scene: lightsSceneKey,
  },
  dungeonPhase5: {
    triggers: ["dungeonDone"],
    scene: dungeonSceneKey,
    createItem: undefinedEventItem,
  },
  dungeonDone: {
    triggers: [],
    scene: hubSceneKey,
    createItem: undefinedEventItem,
  },
  lightsDone: {
    triggers: [],
    scene: hubSceneKey,
    createItem: undefinedEventItem,
  },
};

export const isEventReady = (key: GlobalDataKey) => (scene: Scene) =>
  globalData[key].value(scene);

export const isEventSolved = (key: GlobalDataKey) => (scene: Scene) => {
  return eventsDef[key]?.triggers.every((trigger) =>
    globalData[trigger].value(scene),
  );
};

export const solveEvent = (key: GlobalDataKey) => (scene: Scene) =>
  eventsDef[key]?.triggers.forEach((trigger) =>
    globalData[trigger].setValue(true)(scene),
  );

export const getEventDef = (key: GlobalDataKey): EventDef => eventsDef[key];

export const getEventsOfScene = (scene: string) =>
  pickBy(eventsDef, (def) => def.scene === scene);

export const allEvents = keys(globalData) as GlobalDataKey[];

export const findPreviousEvent = (targetKey: GlobalDataKey): GlobalDataKey => {
  return first(
    compact(
      allEvents.map((key) => {
        const eventDef = getEventDef(key);
        return eventDef.triggers.includes(targetKey) ? key : null;
      }),
    ),
  )!;
};
