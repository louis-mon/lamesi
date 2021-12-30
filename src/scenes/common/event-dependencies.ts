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
