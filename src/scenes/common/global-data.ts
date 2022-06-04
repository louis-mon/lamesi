import { annotate } from "/src/helpers/typing";
import { defineData } from "/src/helpers/component";

// these data are still saved as global but do not truly belong to the player progress
export const otherGlobalData = defineData(
  {
    cheatCodes: annotate<boolean>(),

    dungeonActivateHint: annotate<boolean>(),
    dungeonTakeHint: annotate<boolean>(),
    dungeonSkillHint: annotate<boolean>(),
  },
  "game",
);

export type OtherGlobalDataKey = keyof typeof otherGlobalData;

export const globalData = defineData(
  {
    firstEvent: annotate<boolean>(),

    lights1: annotate<boolean>(),
    lights2: annotate<boolean>(),
    lights3: annotate<boolean>(),
    lights4: annotate<boolean>(),
    lights5: annotate<boolean>(),
    lightsDone: annotate<boolean>(),

    dungeonPhase1: annotate<boolean>(),
    dungeonPhase2: annotate<boolean>(),
    dungeonPhase3: annotate<boolean>(),
    dungeonPhase4: annotate<boolean>(),
    dungeonPhase5: annotate<boolean>(),
    dungeonDone: annotate<boolean>(),

    creatures1: annotate<boolean>(),
    creatures2: annotate<boolean>(),
    creatures3: annotate<boolean>(),
    creatures4: annotate<boolean>(),
    creatures4Done: annotate<boolean>(),
  },
  "game",
);

export type GlobalDataKey = keyof typeof globalData;

export type WithRequiredEvent = {
  eventRequired: GlobalDataKey;
};

export const eventsHelpers = {
  getEventFilter:
    (scene: Phaser.Scene) =>
    (e: WithRequiredEvent): boolean =>
      e.eventRequired ? globalData[e.eventRequired].value(scene) : true,
};
