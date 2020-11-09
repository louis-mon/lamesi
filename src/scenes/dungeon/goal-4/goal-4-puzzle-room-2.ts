import * as Phaser from "phaser";
import { Maybe } from "purify-ts";
import { playerCannotActSubject } from "../definitions";
import * as Wp from "../wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Geom from "/src/helpers/math/geom";
import * as Npc from "../npc";
import * as Def from "../definitions";
import { iceArmorAltar } from "../ice-armor";
import { events } from "../../global-events";
import { amuletSkillAltar } from "../skills";
import { createSpriteAt } from "/src/helpers/phaser";
import { declareGoInstance, spriteClassKind } from "/src/helpers/component";
import {
  goal4Class,
  hintFlameRoom2,
  moveFlameTo,
  playerIsOnFlame,
} from "./goal-4-defs";
import {
  checkSolveSwappingTiles,
  secondSwappingTiles,
  swappingTileBellActions,
} from "../goal-2";

const flameInst = hintFlameRoom2.instance;

const puzzleRoom2: Flow.PhaserNode = Flow.lazy((scene) => {
  return Flow.sequence(
    Flow.waitTrue(playerIsOnFlame(flameInst)),
    moveFlameTo({ instance: flameInst, newPos: { room: 2, x: 4, y: 0 } }),
    Flow.parallel(
      swappingTileBellActions(secondSwappingTiles),
      Flow.observe(
        checkSolveSwappingTiles([0, 1, 2, 3, 5, 7, 9, 11, 12, 13, 14]),
        () => Flow.call(flameInst.data.solved.setValue(true)),
      ),
    ),
  );
});

export const puzzleRoom2Config = {
  instance: hintFlameRoom2,
  flow: puzzleRoom2,
};
