import { annotate } from "../../helpers/typing";
import { DataMappingDefValues, defineData } from "../../helpers/component";

export const globalData = defineData(
  {
    lights1: annotate<boolean>(),
    lightsAvailable: annotate<boolean>(),
    lights2: annotate<boolean>(),
    lights3: annotate<boolean>(),
    lights4: annotate<boolean>(),
    lights5: annotate<boolean>(),

    cheatCodes: annotate<boolean>(),

    dungeonActivateHint: annotate<boolean>(),
    dungeonTakeHint: annotate<boolean>(),
    dungeonSkillHint: annotate<boolean>(),

    dungeonAvailable: annotate<boolean>(),
    dungeonPhase2: annotate<boolean>(),
    dungeonPhase3: annotate<boolean>(),
    dungeonPhase4: annotate<boolean>(),
    dungeonPhase5: annotate<boolean>(),

    creaturesAvailable: annotate<boolean>(),
  },
  "game",
);

export type GlobalDataKey = keyof typeof globalData;

export type WithRequiredEvent = {
  eventRequired?: GlobalDataKey;
};

const initialGlobalData: DataMappingDefValues<typeof globalData> = {
  lights1: true,
  lightsAvailable: false,
  lights2: false,
  lights3: false,
  lights4: false,
  lights5: false,

  cheatCodes: true,

  dungeonActivateHint: false,
  dungeonTakeHint: false,
  dungeonSkillHint: false,

  dungeonAvailable: false,
  dungeonPhase2: false,
  dungeonPhase3: false,
  dungeonPhase4: false,
  dungeonPhase5: false,

  creaturesAvailable: false,
};

export const eventsHelpers = {
  startupEvents: initialGlobalData,
  getEventFilter: (scene: Phaser.Scene) => (e: WithRequiredEvent): boolean =>
    e.eventRequired ? globalData[e.eventRequired].value(scene) : true,
};
