import * as Phaser from "phaser";
import { Maybe } from "purify-ts";
import { playerCannotActSubject } from "../definitions";
import * as Wp from "../wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Geom from "/src/helpers/math/geom";
import * as Npc from "../npc";
import * as Def from "../definitions";
import { iceArmorAltar } from "../ice-armor";
import { globalData } from "../../common/global-data";
import { amuletSkillAltar } from "../skills";
import { createSpriteAt } from "/src/helpers/phaser";
import { declareGoInstance, spriteClassKind } from "/src/helpers/component";
import { makeGreenFlame, moveFlameTo, playerIsOnFlame } from "./goal-4-defs";
import {
  checkSolveSwappingTiles,
  secondSwappingTiles,
  swappingTileBellActions,
} from "../goal-2";

export const greenFlame = makeGreenFlame({
  pos: { room: 4, x: 3, y: 3 },
  hintFrame: "hint-hourglass",
  nextPos: { room: 2, x: 2, y: 0 },
});
const flameInst = greenFlame.instance;

const puzzleRoom2: Flow.PhaserNode = Flow.sequence(
  Flow.waitTrue(playerIsOnFlame(flameInst)),
  moveFlameTo({ instance: flameInst, newPos: { room: 2, x: 4, y: 0 } }),
  Flow.parallel(
    Flow.tween((scene) => ({
      targets: flameInst.getObj(scene),
      props: { scale: 0 },
    })),
    swappingTileBellActions(secondSwappingTiles),
    Flow.observe(
      checkSolveSwappingTiles([0, 1, 2, 3, 5, 7, 9, 11, 12, 13, 14]),
      () => Flow.call(flameInst.data.solved.setValue(true)),
    ),
  ),
);

export const puzzleRoom2Config = {
  instance: greenFlame,
  flow: puzzleRoom2,
};
