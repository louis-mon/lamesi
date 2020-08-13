import { memoryCyclicTween } from "/src/helpers/animate/tween";
import { PhaserNode } from "/src/helpers/phaser-flow";
import {
  createFlamethrower,
  flameThrowers,
} from "/src/scenes/dungeon/fireball";
import * as Phaser from "phaser";
import _ from "lodash";
import { playerIsOnPos } from "./definitions";
import { openDoor } from "./npc";
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
  amuletSkillAltar,
  amuletSkillDef,
} from "./skills";

const puzzleDoorRoom1: PhaserNode = Flow.lazy((scene) => {
  const switchDef = Def.switches.room1ForRoom2Door;
  Npc.switchCrystalFactory(scene)(switchDef);
  return Flow.when({
    condition: switchDef.data.state.subject(scene),
    action: Npc.openDoor("door1to2"),
  });
});

const puzzleRoom2Amulet: PhaserNode = Flow.lazy((scene) => {
  const switchDef = Def.switches.room2ToOpenDoor;
  Npc.switchCrystalFactory(scene)(switchDef);
  const flameInst = flameThrowers.room2;
  const altarPos = { room: 2, x: 1, y: 0 };
  const flameThrowerMovement = memoryCyclicTween({
    getObj: () => flameInst.getObj(scene),
    attr1: { y: Wp.wpPos({ room: 2, x: 0, y: 4 }).y },
    attr2: { y: Wp.wpPos({ room: 2, x: 0, y: 1 }).y },
    speed: Wp.wpSize.y / 1000,
  });
  return Flow.parallel(
    createFlamethrower(flameInst),
    Flow.call(flameInst.data.continuous.setValue(true)),
    amuletSkillAltar({ wp: altarPos }),
    Flow.when({
      condition: playerIsOnPos({ room: 2, x: 0, y: 2 }),
      action: Flow.parallel(
        Npc.closeDoor("door1to2"),
        Flow.call(
          Def.scene.data.playerCheckpoint.setValue(
            Wp.getWpId({ room: 2, x: 0, y: 0 }),
          ),
        ),
      ),
    }),
    Flow.when({
      condition: switchDef.data.state.subject,
      action: openDoor("door1to2"),
    }),
    Flow.when({
      condition: combineLatest([
        Def.scene.data.currentSkill.subject(scene),
        playerIsOnPos(altarPos)(scene),
      ]).pipe(
        map(
          ([currentSkill, onPos]) =>
            onPos && currentSkill === amuletSkillDef.key,
        ),
      ),
      action: flameThrowerMovement,
    }),
  );
});

export const dungeonGoal3 = Flow.parallel(puzzleDoorRoom1, puzzleRoom2Amulet);
