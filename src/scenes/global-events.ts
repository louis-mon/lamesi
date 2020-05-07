export type EventKey = string & {
  __eventKey: null;
};

const declareEvent = (key: string) => key as EventKey;

export const events = {
  lights1: declareEvent("lights1"),
  lights2: declareEvent("lights2"),
  lights3: declareEvent("lights3")
};

export type WithRequiredEvent = {
  eventRequired?: EventKey;
};

export const eventsHelpers = {
  startupEvents: [events.lights1, events.lights2, events.lights3],
  getEventFilter: (scene: Phaser.Scene) => (e: WithRequiredEvent): boolean =>
    e.eventRequired ? scene.registry.get(e.eventRequired) : true
};
