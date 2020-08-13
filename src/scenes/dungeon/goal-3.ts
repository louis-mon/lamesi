import { memoryCyclicTween } from "/src/helpers/animate/tween";
import { when } from "/src/helpers/flow";
import * as Flow from "/src/helpers/phaser-flow";
import { PhaserNode } from "/src/helpers/phaser-flow";
import {
  createFlamethrower,
  flameThrowers,
} from "/src/scenes/dungeon/fireball";
import * as Phaser from "phaser";
import { combineLatest } from "rxjs";
import { map } from "rxjs/operators";
import * as Def from "./definitions";
import { placeCheckpoint, playerIsOnPos } from "./definitions";
import * as Npc from "./npc";
import { endGoalAltarPlaceholder, openDoor } from "./npc";
import { amuletSkillAltar, amuletSkillDef, bellHiddenAction } from "./skills";
import * as Wp from "./wp";
import { setGroundObstacleLine } from "./wp";
import Line = Phaser.Geom.Line;

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
const room0Spikes: Line[] = [
  new Phaser.Geom.Line(4, 2, 5, 2),
  new Phaser.Geom.Line(4, 2, 4, 4),
  new Phaser.Geom.Line(1, 4, 4, 4),
  new Phaser.Geom.Line(1, 1, 1, 3),
  new Phaser.Geom.Line(0, 3, 1, 3),
  new Phaser.Geom.Line(1, 1, 3, 1),
];

export const puzzleRoom0: Flow.PhaserNode = Flow.lazy((scene) => {
  const setSpikes = (open: boolean) =>
    room0Spikes.forEach((line) =>
      setGroundObstacleLine({
        kind: open ? "none" : "spike",
        line,
        room: 0,
      })(scene),
    );
  setSpikes(false);
  Npc.switchCrystalFactory(scene)(Def.switches.room0ToOpenDoor);

  return Flow.parallel(
    placeCheckpoint({ room: 0, x: 4, y: 3 }),
    when({
      condition: Def.switches.room0ToOpenDoor.data.state.subject,
      action: Flow.parallel(
        openDoor("door3To0"),
        Flow.call(() => setSpikes(false)),
      ),
    }),
    bellHiddenAction({
      wp: { room: 0, x: 4, y: 0 },
      action: ({ wp }) => endGoalAltarPlaceholder({ n: 3, wp }),
    }),
  );
});

export const dungeonGoal3 = Flow.parallel(
  puzzleDoorRoom1,
  puzzleRoom2Amulet,
  puzzleRoom0,
);
