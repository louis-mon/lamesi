import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Flow from "/src/helpers/phaser-flow";
import _ from "lodash";
import {
  createBloomButtonFactory,
  legsBloomClass,
} from "/src/scenes/creatures/legs/bloom-button";
import { legFlow } from "/src/scenes/creatures/legs/legs-leg";

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

const firstLevelAngle = -Math.PI / 10;
const secondLevelAngle = 0;
const thirdLevelAngle = Math.PI / 8;

export const legsFlow: Flow.PhaserNode = Flow.parallel(
  createBloomButton({
    pos: new Vector2(400, 610),
    id: idButton1,
  }),
  createBloomButton({
    pos: new Vector2(260, 710),
    id: idButton2,
    linkedLeg: { startAngle: Math.PI - firstLevelAngle, flip: true },
  }),
  createBloomButton({
    pos: new Vector2(512, 720),
    id: idButton3,
    linkedLeg: { startAngle: firstLevelAngle },
  }),
  createBloomButton({
    pos: new Vector2(230, 870),
    id: idButton4,
    linkedLeg: { startAngle: Math.PI - secondLevelAngle },
  }),
  createBloomButton({
    pos: new Vector2(380, 852),
    id: idButton5,
  }),
  createBloomButton({
    pos: new Vector2(560, 868),
    id: idButton6,
    linkedLeg: { startAngle: secondLevelAngle, flip: true },
  }),
  createBloomButton({
    pos: new Vector2(318, 980),
    id: idButton7,
    linkedLeg: { startAngle: Math.PI - thirdLevelAngle },
  }),
  createBloomButton({
    pos: new Vector2(458, 984),
    id: idButton8,
    linkedLeg: { startAngle: thirdLevelAngle, flip: true },
  }),
  Flow.call(legsBloomClass.events.attachThorn(idButton1).emit({})),
);
