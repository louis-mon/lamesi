import _ from "lodash";
import { annotate } from "../helpers/typing";
import { defineData } from "../helpers/component";

export type EventKey = string & {
  __eventKey: null;
};

export const events = defineData(
  {
    lights1: annotate<boolean>(),
    lights2: annotate<boolean>(),
    lights3: annotate<boolean>(),
    lights4: annotate<boolean>(),

    cheatCodes: annotate<boolean>(),

    dungeonActivateHint: annotate<boolean>(),
    dungeonTakeHint: annotate<boolean>(),
    dungeonSkillHint: annotate<boolean>(),
  },
  "game",
);

export type WithRequiredEvent = {
  eventRequired?: keyof typeof events;
};

const startupEvents: Array<keyof typeof events> = [
  "lights1",
  "lights2",
  "lights3",
  "lights4",
  "cheatCodes",
];

export const eventsHelpers = {
  startupEvents: startupEvents,
  getEventFilter: (scene: Phaser.Scene) => (e: WithRequiredEvent): boolean =>
    e.eventRequired ? events[e.eventRequired].value(scene) : true,
};
