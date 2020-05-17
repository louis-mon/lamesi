import _ from "lodash";
import { defineEvents } from "../helpers/events";
import { annotate } from "../helpers/typing";

export type EventKey = string & {
  __eventKey: null;
};

const declareEvent = (key: string) => key as EventKey;

export const events = defineEvents({
  lights1: annotate<() => void>(),
  lights2: annotate<() => void>(),
  lights3: annotate<() => void>(),
  lights4: annotate<() => void>(),
});

export type WithRequiredEvent = {
  eventRequired?: EventKey;
};

export const eventsHelpers = {
  startupEvents: [
    events.lights1.key,
    events.lights2.key,
    events.lights3.key,
    events.lights4.key,
  ],
  getEventFilter: (scene: Phaser.Scene) => (e: WithRequiredEvent): boolean =>
    e.eventRequired ? scene.registry.get(e.eventRequired) : true,
};
