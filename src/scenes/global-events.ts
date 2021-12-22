import _ from "lodash";
import { annotate } from "../helpers/typing";
import { DataMappingDefValues, defineData } from "../helpers/component";

export type EventKey = string & {
  __eventKey: null;
};

export const events = defineData(
  {
    lightsTrigger: annotate<boolean>(),
    lightsAvailable: annotate<boolean>(),
    lights1: annotate<boolean>(),
    lights2: annotate<boolean>(),
    lights3: annotate<boolean>(),
    lights4: annotate<boolean>(),

    cheatCodes: annotate<boolean>(),

    dungeonActivateHint: annotate<boolean>(),
    dungeonTakeHint: annotate<boolean>(),
    dungeonSkillHint: annotate<boolean>(),

    dungeonAvailable: annotate<boolean>(),
    dungeonPhase1: annotate<boolean>(),
    dungeonPhase2: annotate<boolean>(),
    dungeonPhase3: annotate<boolean>(),
    dungeonPhase4: annotate<boolean>(),

    creaturesAvailable: annotate<boolean>(),
  },
  "game",
);

export type WithRequiredEvent = {
  eventRequired?: keyof typeof events;
};

const startupEvents: DataMappingDefValues<typeof events> = {
  lightsAvailable: false,
  lightsTrigger: true,
  lights1: false,
  lights2: false,
  lights3: false,
  lights4: false,

  cheatCodes: true,

  dungeonActivateHint: false,
  dungeonTakeHint: false,
  dungeonSkillHint: false,

  dungeonAvailable: false,
  dungeonPhase1: false,
  dungeonPhase2: false,
  dungeonPhase3: false,
  dungeonPhase4: false,

  creaturesAvailable: false,
};

export const eventsHelpers = {
  startupEvents: startupEvents,
  getEventFilter: (scene: Phaser.Scene) => (e: WithRequiredEvent): boolean =>
    e.eventRequired ? events[e.eventRequired].value(scene) : true,
};
