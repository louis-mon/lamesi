export type EventKey = string & {
  __eventKey: null;
};

const declareEvent = (key: string) => key as EventKey;

export const events = {
  lights1: declareEvent("lights-1"),
  lights2: declareEvent("lights-2")
};

export type WithRequiredEvent = {
  eventRequired?: EventKey;
};

export const eventsHelpers = {
  startupEvents: [],
  getEventFilter: (scene: Phaser.Scene) => (e: WithRequiredEvent): boolean =>
    e.eventRequired ? scene.registry.get(e.eventRequired) : true
};
