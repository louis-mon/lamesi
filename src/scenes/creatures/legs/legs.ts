import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Flow from "/src/helpers/phaser-flow";
import _ from "lodash";
import {
  createBloomButtonFactory,
  legsBloomClass,
} from "/src/scenes/creatures/legs/bloom-button";
import { sceneClass } from "/src/scenes/creatures/def";
import { legsSwingDuration } from "/src/scenes/creatures/legs/legs-defs";
import { globalData } from "/src/scenes/common/global-data";

const idButton1 = _.uniqueId();
const idButton2 = _.uniqueId();
const idButton3 = _.uniqueId();
const idButton4 = _.uniqueId();
const idButton5 = _.uniqueId();
const idButton6 = _.uniqueId();
const idButton7 = _.uniqueId();
const idButton8 = _.uniqueId();

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
  Flow.call(legsBloomClass.events.attachThorn(idButton1).emit({})),
  Flow.repeatSequence(
    Flow.waitTimer(legsSwingDuration * 4),
    Flow.call(sceneClass.events.syncLegs.emit({})),
  ),
);

export const legsFlow = Flow.whenTrueDo({
  condition: globalData.creatures2.dataSubject,
  action: createLegs,
});
