import { memoryCyclicTween } from "/src/helpers/animate/tween";
import { declareGoInstances, defineGoClass } from "/src/helpers/component";
import { whenTrueDo } from "/src/helpers/flow";
import { createSpriteAt } from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { PhaserNode } from "/src/helpers/phaser-flow";
import { annotate, ValueOf } from "/src/helpers/typing";
import { flameThrowers } from "/src/scenes/dungeon/fireball";
import * as Phaser from "phaser";
import { combineLatest } from "rxjs";
import { map } from "rxjs/operators";
import * as Def from "./definitions";
import { placeCheckpoint, playerIsOnPos } from "./definitions";
import * as Npc from "./npc";
import { DoorKey, endGoalAltarPlaceholder, openDoor } from "./npc";
import {
  amuletSkillAltar,
  amuletSkillDef,
  bellHiddenAction,
  bellSkillAltar,
} from "./skills";
import * as Wp from "./wp";
import { setGroundObstacleLine } from "./wp";
import Line = Phaser.Geom.Line;
import { globalData, GlobalDataKey } from "../common/global-data";
import { isEventSolved } from "/src/scenes/common/events-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { openDoorWithKeyItem } from "/src/scenes/dungeon/door";
import { dungeonCutscene } from "/src/scenes/dungeon/dungeon-cutscene";

const puzzleDoorRoom1: PhaserNode = Flow.lazy((scene) => {
  const switchDef = Def.switches.room1ForRoom2Door;
  Npc.switchCrystalFactory(scene)(switchDef);
  return Flow.whenTrueDo({
    condition: switchDef.data.state.subject(scene),
    action: dungeonCutscene({
      targetWp: { room: 1, x: 4, y: 2 },
      inCutscene: Npc.openDoor("door1to2"),
    }),
  });
});

const puzzleRoom2Amulet: PhaserNode = Flow.lazy((scene) => {
  const switchDef = Def.switches.room2ToOpenDoor;
  Npc.switchCrystalFactory(scene)(switchDef);
  const flameInst = flameThrowers.room2;
  const altarPos = { room: 2, x: 1, y: 0 };
  const flameThrowerMovement = memoryCyclicTween({
    getObj: () => flameInst.getObj(scene),
    attr1: { y: Wp.wpPos({ room: 2, x: 0, y: 3.5 }).y },
    attr2: { y: Wp.wpPos({ room: 2, x: 0, y: 1 }).y },
    speed: Wp.wpSize.y / 1000,
  });
  return Flow.parallel(
    Flow.call(flameInst.data.continuous.setValue(true)),
    amuletSkillAltar({ wp: altarPos }),
    Flow.sequence(
      placeCheckpoint({ room: 2, x: 0, y: 2 }),
      Flow.parallel(Npc.closeDoor("door1to2"), Npc.closeDoor("door4To1")),
      placeCheckpoint({ room: 1, x: 3, y: 4 }),
    ),
    Flow.whenTrueDo({
      condition: switchDef.data.state.subject,
      action: openDoor("door1to2"),
    }),
    Flow.whenTrueDo({
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

const groundSwitchClass = defineGoClass({
  kind: annotate<Phaser.GameObjects.Sprite>(),
  events: {},
  config: annotate<{ wp: Wp.WpDef }>(),
  data: {
    state: annotate<boolean>(),
  },
});

const groundSwitches = declareGoInstances(
  groundSwitchClass,
  "ground-switches",
  {
    switchA: {
      wp: { room: 0, x: 2, y: 4 },
    },
    switchB: { wp: { room: 0, x: 1, y: 0 } },
    switchC: { wp: { room: 0, x: 3, y: 0 } },
  },
);

type GroundSwitch = ValueOf<typeof groundSwitches>;
const createGroundSwitch = (inst: GroundSwitch): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    inst.create(
      createSpriteAt(
        scene,
        Wp.wpPos(inst.config.wp),
        "npc",
        "ground-switch-up",
      ).setDepth(Def.depths.carpet),
    );
    inst.data.state.setValue(false)(scene);
    return Flow.parallel(
      Flow.observe(playerIsOnPos(inst.config.wp), (isOnSwitch) =>
        Flow.call(() => {
          inst
            .getObj(scene)
            .setFrame(isOnSwitch ? "ground-switch-down" : "ground-switch-up");
          inst.data.state.setValue(isOnSwitch)(scene);
        }),
      ),
    );
  });

const switchesToFire = [
  {
    ground: groundSwitches.switchA,
    fires: [flameThrowers.room0ALeft, flameThrowers.room0ARight],
  },
  {
    ground: groundSwitches.switchB,
    fires: [flameThrowers.room0BLeft, flameThrowers.room0BRight],
  },
  {
    ground: groundSwitches.switchC,
    fires: [flameThrowers.room0BLeft, flameThrowers.room0BRight],
  },
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
    placeCheckpoint({ room: 0, x: 4, y: 2 }),
    whenTrueDo({
      condition: Def.switches.room0ToOpenDoor.data.state.subject,
      action: Flow.parallel(
        openDoor("door3To0"),
        Flow.call(() => setSpikes(true)),
      ),
    }),
    bellHiddenAction({
      wp: { room: 0, x: 4, y: 0 },
      action: ({ wp }) =>
        endGoalAltarPlaceholder({ eventToSolve: "dungeonPhase3", wp }),
    }),
    ...switchesToFire.map((conf) =>
      Flow.parallel(
        createGroundSwitch(conf.ground),
        Flow.repeatWhen({
          condition: conf.ground.data.state.subject,
          action: Flow.sequence(
            Flow.waitTimer(1000),
            ...conf.fires.map((fire) => Flow.call(fire.events.fire.emit({}))),
          ),
        }),
      ),
    ),
  );
});

const eventKey: GlobalDataKey = "dungeonPhase3";
const startDoorToOpen: DoorKey = "door4To1";

const enableGoal3 = Flow.whenTrueDo({
  condition: globalData.dungeonPhase3.dataSubject,
  action: Flow.lazy((scene) => {
    const isSolved = isEventSolved(eventKey)(scene);
    const openAnimation = Flow.whenTrueDo({
      condition: globalEvents.subSceneEntered.subject,
      action: openDoorWithKeyItem({ doorKey: startDoorToOpen, eventKey }),
    });
    return Flow.parallel(
      ...(isSolved ? [Npc.openDoor(startDoorToOpen)] : [openAnimation]),
      bellSkillAltar({ wp: { room: 4, x: 0, y: 3 } }),
    );
  }),
});

export const dungeonGoal3 = Flow.parallel(
  enableGoal3,
  puzzleDoorRoom1,
  puzzleRoom2Amulet,
  puzzleRoom0,
);
