import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Flow from "/src/helpers/phaser-flow";
import _ from "lodash";
import {
  createBloomButton,
  legsBloomClass,
} from "/src/scenes/creatures/legs/bloom-button";

const idButton1 = _.uniqueId();
const idButton2 = _.uniqueId();
const idButton3 = _.uniqueId();
const idButton4 = _.uniqueId();
const idButton5 = _.uniqueId();
const idButton6 = _.uniqueId();
const idButton7 = _.uniqueId();

export const legsFlow: Flow.PhaserNode = Flow.parallel(
  createBloomButton({ pos: new Vector2(400, 610), id: idButton1 }),
  createBloomButton({ pos: new Vector2(300, 740), id: idButton2 }),
  createBloomButton({ pos: new Vector2(472, 750), id: idButton3 }),
  createBloomButton({ pos: new Vector2(230, 870), id: idButton4 }),
  createBloomButton({ pos: new Vector2(380, 885), id: idButton5 }),
  createBloomButton({ pos: new Vector2(520, 868), id: idButton6 }),
  createBloomButton({ pos: new Vector2(378, 1020), id: idButton7 }),
  Flow.sequence(
    Flow.waitTimer(3000),
    Flow.call(legsBloomClass.events.openLeaves(idButton1).emit({})),
  ),
);
