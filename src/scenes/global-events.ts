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

    cheatCodes:  annotate<boolean>(),
  },
  "game",
);

export type WithRequiredEvent = {
  eventRequired?: keyof typeof events;
};

export const eventsHelpers = {
  startupEvents: Object.keys(events),
  getEventFilter: (scene: Phaser.Scene) => (e: WithRequiredEvent): boolean =>
    e.eventRequired ? events[e.eventRequired].value(scene) : true,
};
