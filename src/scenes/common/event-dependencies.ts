import { globalData, GlobalDataKey } from "/src/scenes/common/global-data";
import { Scene } from "phaser";

type EventDependency = { triggers: GlobalDataKey[]; keyItem: string };

type EventDependencies = {
  [data in GlobalDataKey]?: EventDependency;
};

export const eventDependencies: EventDependencies = {
  lights1: {
    triggers: ["creatures1"],
    keyItem: "book",
  },
  creatures1: {
    triggers: ["dungeonPhase1"],
    keyItem: "",
  },
  dungeonPhase1: {
    triggers: ["lights2"],
    keyItem: "",
  },
  lights2: {
    triggers: ["creatures4", "dungeonPhase2"],
    keyItem: "",
  },
  dungeonPhase2: {
    triggers: ["lights3"],
    keyItem: "",
  },
  lights3: {
    triggers: ["dungeonPhase3"],
    keyItem: "",
  },
  dungeonPhase3: {
    triggers: ["creatures3"],
    keyItem: "",
  },
  creatures4: {
    triggers: ["creatures4Done"],
    keyItem: "",
  },
  creatures3: {
    triggers: ["creatures3Done"],
    keyItem: "",
  },
  creatures4Done: {
    triggers: ["lights4"],
    keyItem: "",
  },
  creatures3Done: {
    triggers: ["lights4"],
    keyItem: "",
  },
  lights4: {
    triggers: ["dungeonPhase4"],
    keyItem: "",
  },
  dungeonPhase4: {
    triggers: ["creatures2"],
    keyItem: "",
  },
  creatures2: {
    triggers: ["lights5", "dungeonPhase5"],
    keyItem: "",
  },
};

export const isEventSolved = (key: GlobalDataKey) => (scene: Scene) => {
  return eventDependencies[key]?.triggers.every((trigger) =>
    globalData[trigger].value(scene),
  );
};

export const solveEvent = (key: GlobalDataKey) => (scene: Scene) =>
  eventDependencies[key]?.triggers.forEach((trigger) =>
    globalData[trigger].setValue(true)(scene),
  );

export const getEventDependency = (key: GlobalDataKey): EventDependency =>
  eventDependencies[key]!;
