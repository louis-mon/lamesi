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
  hintFlameRoom5,
  makeGreenFlame,
  moveFlameTo,
  playerIsOnFlame,
} from "./goal-4-defs";

const greenFlame = hintFlameRoom5;

const puzzleFlow: Flow.PhaserNode = Flow.sequence(
  Flow.waitTrue(playerIsOnFlame(greenFlame.instance)),
  Flow.tween((scene) => ({
    targets: greenFlame.instance.getObj(scene),
    props: { scale: 0 },
  })),
  Flow.call(Def.scene.events.showAltSwitchInRoom5.emit({})),
);

export const goal4PuzzleRoom5Config = {
  instance: greenFlame,
  flow: puzzleFlow,
};
