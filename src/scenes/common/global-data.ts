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

    dungeonPhase1: annotate<boolean>(),
    dungeonPhase2: annotate<boolean>(),
    dungeonPhase3: annotate<boolean>(),
    dungeonPhase4: annotate<boolean>(),
    dungeonPhase5: annotate<boolean>(),

    creatures1: annotate<boolean>(),
    creatures2: annotate<boolean>(),
    creatures3: annotate<boolean>(),
    creatures4: annotate<boolean>(),
  },
  "game",
);

export type GlobalDataKey = keyof typeof globalData;

export type WithRequiredEvent = {
  eventRequired?: GlobalDataKey;
};

export const eventsHelpers = {
  getEventFilter: (scene: Phaser.Scene) => (e: WithRequiredEvent): boolean =>
    e.eventRequired ? globalData[e.eventRequired].value(scene) : true,
};
