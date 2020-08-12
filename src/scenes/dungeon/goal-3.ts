import { PhaserNode } from "/src/helpers/phaser-flow";
import {
  createFlamethrower,
  flameThrowers,
} from "/src/scenes/dungeon/fireball";
import * as Phaser from "phaser";
import _ from "lodash";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt, vecToXY, createImageAt } from "/src/helpers/phaser";
import * as Npc from "./npc";
import { makeMenu } from "./menu";
import { subWordGameBeginEvent, gameWidth, gameHeight } from "../common";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  customEvent,
  defineData,
  makeSceneDataHelper,
  MakeObservable,
} from "/src/helpers/component";
import { combineContext, getProp } from "/src/helpers/functional";
import { combineLatest } from "rxjs";
import { map, pairwise, auditTime, first } from "rxjs/operators";
import {
  initSkills,
  skillsFlow,
  bellSkillAltar,
  bellHiddenAction,
} from "./skills";

const puzzleDoorRoom1: PhaserNode = Flow.lazy((scene) => {
  const switchDef = Def.switches.room1ForRoom2Door;
  Npc.switchCrystalFactory(scene)(switchDef);
  return Flow.when({
    condition: switchDef.data.state.subject(scene),
    action: Npc.openDoor("door1to2"),
  });
});

const playerIsOnPos = (wpId: Wp.WpId): MakeObservable<boolean> => (scene) =>
  Def.player.data.currentPos.subject(scene).pipe(map((pos) => pos === wpId));

const puzzleRoom2Amulet: PhaserNode = Flow.lazy((scene) => {
  const switchDef = Def.switches.room2ToOpenDoor;
  Npc.switchCrystalFactory(scene)(switchDef);
  const flameInst = flameThrowers.room2;
  return Flow.parallel(
    createFlamethrower(flameInst),
    Flow.call(flameInst.data.continuous.setValue(true)),
    Flow.when({
      condition: playerIsOnPos(Wp.getWpId({ room: 2, x: 0, y: 2 })),
      action: Npc.closeDoor("door1to2"),
    }),
  );
});

export const dungeonGoal3 = Flow.parallel(puzzleDoorRoom1, puzzleRoom2Amulet);
