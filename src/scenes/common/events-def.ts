import { globalData, GlobalDataKey } from "/src/scenes/common/global-data";
import { Scene } from "phaser";
import {
  creaturesSceneKey,
  dungeonSceneKey,
  hubSceneKey,
  lightsSceneKey,
} from "/src/scenes/common/constants";
import { compact, first, keys, pickBy } from "lodash";

type EventDef = {
  triggers: GlobalDataKey[];
  keyItem: string;
  scene: string;
};

type EventsDef = {
  [data in GlobalDataKey]: EventDef;
};

export const eventsDef: EventsDef = {
  firstEvent: {
    triggers: ["lights1"],
    keyItem: "circle-gem",
    scene: hubSceneKey,
  },
  lights1: {
    triggers: ["creatures1"],
    keyItem: "book",
    scene: lightsSceneKey,
  },
  creatures1: {
    triggers: ["dungeonPhase1"],
    keyItem: "woman",
    scene: creaturesSceneKey,
  },
  dungeonPhase1: {
    triggers: ["lights2"],
    keyItem: "drop",
    scene: dungeonSceneKey,
  },
  lights2: {
    triggers: ["creatures4", "dungeonPhase2"],
    keyItem: "seeds",
    scene: lightsSceneKey,
  },
  dungeonPhase2: {
    triggers: ["lights3"],
    keyItem: "",
    scene: dungeonSceneKey,
  },
  lights3: {
    triggers: ["dungeonPhase3"],
    keyItem: "",
    scene: lightsSceneKey,
  },
  dungeonPhase3: {
    triggers: ["creatures3"],
    keyItem: "",
    scene: dungeonSceneKey,
  },
  creatures4: {
    triggers: ["creatures4Done"],
    keyItem: "",
    scene: creaturesSceneKey,
  },
  creatures3: {
    triggers: ["creatures3Done"],
    keyItem: "",
    scene: creaturesSceneKey,
  },
  creatures4Done: {
    triggers: ["lights4"],
    keyItem: "",
    scene: creaturesSceneKey,
  },
  creatures3Done: {
    triggers: ["lights4"],
    keyItem: "",
    scene: creaturesSceneKey,
  },
  lights4: {
    triggers: ["dungeonPhase4"],
    keyItem: "",
    scene: lightsSceneKey,
  },
  dungeonPhase4: {
    triggers: ["creatures2"],
    keyItem: "",
    scene: dungeonSceneKey,
  },
  creatures2: {
    triggers: ["lights5", "dungeonPhase5"],
    keyItem: "",
    scene: creaturesSceneKey,
  },
  lights5: {
    triggers: ["lightsDone"],
    keyItem: "",
    scene: lightsSceneKey,
  },
  dungeonPhase5: {
    triggers: ["dungeonDone"],
    scene: dungeonSceneKey,
    keyItem: "",
  },
  dungeonDone: {
    triggers: [],
    scene: hubSceneKey,
    keyItem: "",
  },
  lightsDone: {
    triggers: [],
    scene: hubSceneKey,
    keyItem: "",
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
