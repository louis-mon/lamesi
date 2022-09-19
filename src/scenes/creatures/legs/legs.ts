import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Flow from "/src/helpers/phaser-flow";
import _ from "lodash";
import {
  createBloomButtonFactory,
  legsBloomClass,
} from "/src/scenes/creatures/legs/bloom-button";
import * as Def from "/src/scenes/creatures/def";
import { isEventReady, isEventSolved } from "/src/scenes/common/events-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { cutscene } from "/src/scenes/common/cutscene";
import { manDeskPos, moveMan } from "/src/scenes/creatures/man";

const idButton1 = _.uniqueId();
const idButton2 = _.uniqueId();
const idButton3 = _.uniqueId();
const idButton4 = _.uniqueId();
const idButton5 = _.uniqueId();
const idButton6 = _.uniqueId();
const idButton7 = _.uniqueId();
const idButton8 = _.uniqueId();

const requiredEvent = Def.bodyPartsConfig.leg.requiredEvent;

const createBloomButton = createBloomButtonFactory({
  budsDependency: {
    [idButton2]: [idButton1],
    [idButton3]: [idButton1],
    [idButton4]: [idButton2],
    [idButton5]: [idButton2, idButton3],
    [idButton6]: [idButton3],
    [idButton7]: [idButton4, idButton5],
    [idButton8]: [idButton6, idButton5],
  },
});

const openAnimation: Flow.PhaserNode = Flow.lazy((scene) => {
  const start = Flow.call(
    legsBloomClass.events.attachThorn(idButton1).emit({}),
  );

  if (isEventSolved(requiredEvent)(scene)) {
    return start;
  }

  const itinerary: Vector2[] = [
    new Vector2(672.3, 924.86),
    new Vector2(636.22, 607.35),
    new Vector2(448.6, 592.92),
  ];

  return Flow.sequence(
    Flow.wait(globalEvents.subSceneEntered.subject),
    cutscene(
      Flow.sequence(
        ...itinerary.map((dest) => moveMan({ dest })),
        Flow.waitTimer(800),
        start,
        Flow.waitTimer(1200),
        ...itinerary
          .slice()
          .reverse()
          .concat(manDeskPos)
          .map((dest) => moveMan({ dest })),
      ),
    ),
  );
});

const createLegs: Flow.PhaserNode = Flow.parallel(
  createBloomButton({
    pos: new Vector2(400, 610),
    id: idButton1,
  }),
  createBloomButton({
    pos: new Vector2(260, 710),
    id: idButton2,
    linkedLegSlot: 0,
  }),
  createBloomButton({
    pos: new Vector2(512, 720),
    id: idButton3,
    linkedLegSlot: 3,
  }),
  createBloomButton({
    pos: new Vector2(230, 870),
    id: idButton4,
    linkedLegSlot: 1,
  }),
  createBloomButton({
    pos: new Vector2(380, 852),
    id: idButton5,
  }),
  createBloomButton({
    pos: new Vector2(560, 868),
    id: idButton6,
    linkedLegSlot: 4,
  }),
  createBloomButton({
    pos: new Vector2(318, 980),
    id: idButton7,
    linkedLegSlot: 2,
  }),
  createBloomButton({
    pos: new Vector2(458, 984),
    id: idButton8,
    linkedLegSlot: 5,
  }),
  openAnimation,
);

export const legsFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  if (!isEventReady(requiredEvent)(scene)) {
    return Flow.noop;
  }
  return createLegs;
});
