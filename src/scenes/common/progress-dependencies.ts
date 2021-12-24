import { globalData, GlobalDataKey } from "/src/scenes/common/global-data";
import { Scene } from "phaser";

type ProgressDependencies = {
  [data in GlobalDataKey]?: { triggers: GlobalDataKey[] };
};

export const progressDependencies: ProgressDependencies = {
  lights1: {
    triggers: ["creatures1"],
  },
};

export const isEventSolved = (scene: Scene) => (key: GlobalDataKey) => {
  return progressDependencies[key]?.triggers.every((trigger) =>
    globalData[trigger].value(scene),
  );
};

export const solveEvent = (key: GlobalDataKey) => (scene: Scene) =>
  progressDependencies[key]?.triggers.forEach((trigger) =>
    globalData[trigger].setValue(true)(scene),
  );
