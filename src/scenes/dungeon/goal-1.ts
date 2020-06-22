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
} from "/src/helpers/component";
import { combineContext, getProp } from "/src/helpers/functional";
import { combineLatest } from "rxjs";
import { map } from "rxjs/operators";
import { arrowSkillAltar } from "./skills";
import { menuHelpers } from "../menu";

const arrowCirclePuzzle = Flow.lazy((scene: Phaser.Scene) => {
  const mechanisms = [
    {
      switchDef: Def.switches.room5Rotate1,
      startTurn: 2,
    },
    {
      switchDef: Def.switches.room5Rotate2,
      startTurn: 5,
    },
    {
      switchDef: Def.switches.room5Rotate3,
      startTurn: 3,
    },
  ];

  const rotateMechClass = defineGoClass({
    events: { turn: customEvent() },
    data: {
      turn: annotate<number>(),
    },
    kind: annotate<Phaser.GameObjects.Image>(),
  });
  const getRotateMechDef = (switchKey: string) =>
    declareGoInstance(rotateMechClass, `${switchKey}-rotate-mech`);
  const totalTurns = 6;
  const turnAngle = 360 / totalTurns;
  const getRotateMechAngle = (i: number) => turnAngle * i;

  const hint = createImageAt(
    scene,
    Wp.wpPos({ room: 5, x: 4, y: 0 }),
    "npc",
    "symbol-circle-hint",
  )
    .setDepth(Def.depths.carpet)
    .setScale(0.5);

  const switchFlows = mechanisms.map(({ switchDef, startTurn }, i) => {
    Npc.switchCrystalFactory(scene)(switchDef);
    const rotateDef = getRotateMechDef(switchDef.key);
    const rotateObj = rotateDef.create(
      createImageAt(
        scene,
        Wp.wpPos({ room: 5, x: 2, y: 2 }),
        "npc",
        `symbol-circle-${i + 1}`,
      )
        .setDepth(Def.depths.carpet)
        .setAngle(getRotateMechAngle(startTurn)),
    );
    const turnData = rotateDef.data.turn;
    turnData.setValue(startTurn)(scene);
    const state = switchDef.data.state;

    return Flow.parallel(
      Flow.observe(rotateDef.events.turn.subject, () => {
        const newTurn = (turnData.value(scene) + 1) % 6;
        return Flow.sequence(
          Flow.rotateTween({
            targets: rotateObj,
            duration: 400,
            props: { angle: getRotateMechAngle(newTurn) },
          }),
          Flow.call(
            combineContext(
              switchDef.events.deactivateSwitch.emit({}),
              turnData.setValue(newTurn),
            ),
          ),
        );
      }),
      Flow.repeatWhen({
        condition: state.subject,
        action: Flow.call(rotateDef.events.turn.emit({})),
      }),
    );
  });
  const solvePuzzle = Flow.when({
    condition: combineLatest(
      mechanisms.map(({ switchDef }) => {
        const rotateDef = getRotateMechDef(switchDef.key);
        return rotateDef.data.turn
          .dataSubject(scene)
          .pipe(map((turn) => turn === 0));
      }),
    ).pipe(map((rightPos) => rightPos.every((p) => p))),
    action: Flow.sequence(
      Flow.tween({ targets: hint, props: { alpha: 0 } }),
      Flow.call(() => hint.destroy()),
      arrowSkillAltar({ wp: { room: 5, x: 4, y: 0 } }),
    ),
  });
  return Flow.parallel(...switchFlows, solvePuzzle);
});
const switchesForDoor4To5: Flow.PhaserNode = Flow.sequence(
  Flow.call((scene) => {
    const factory = Npc.switchCrystalFactory(scene);
    factory(Def.switches.room4ForRoom5Door);
    factory(Def.switches.room5ForRoom4Door);
    Wp.setGroundObstacleRect({
      room: 5,
      wp1: { x: 0, y: 0 },
      wp2: { x: 1, y: 1 },
      kind: "spike",
    })(scene);
  }),
  Flow.parallel(
    Flow.when({
      condition: Def.switches.room4ForRoom5Door.data.state.subject,
      action: Npc.openDoor("door4To5"),
    }),
    Flow.when({
      condition: Def.switches.room5ForRoom4Door.data.state.subject,
      action: Npc.openDoor("door4To5"),
    }),
    Flow.when({
      condition: (scene) =>
        Def.player.data.currentPos
          .subject(scene)
          .pipe(map((pos) => pos === Wp.getWpId({ room: 5, x: 0, y: 2 }))),
      action: Npc.closeDoor("door4To5"),
    }),
  ),
);

const createGoal1: Flow.PhaserNode = Flow.lazy((scene) => {
  const switchFactory = Npc.switchCrystalFactory(scene);
  const switches = [Def.switches.goal1Left, Def.switches.goal1Right];
  switches.forEach((switchDef) => {
    switchFactory(switchDef);
  });
  Wp.setGroundObstacleRect({
    wp1: { x: 1, y: 0 },
    wp2: { x: 1, y: 2 },
    room: 4,
    kind: "spike",
  })(scene);
  Wp.setGroundObstacleRect({
    wp1: { x: 4, y: 0 },
    wp2: { x: 4, y: 2 },
    room: 4,
    kind: "spike",
  })(scene);
  const goalAltar = Npc.endGoalAltarPlaceholder({
    wp: { room: 4, x: 2, y: 2 },
    n: 1,
  });
  const setGoalSpikes = (open: boolean) =>
    Wp.setGroundObstacleRect({
      wp1: { x: 2, y: 2 },
      wp2: { x: 3, y: 3 },
      room: 4,
      kind: open ? "none" : "spike",
    });
  setGoalSpikes(false)(scene);
  return Flow.parallel(
    goalAltar,
    Flow.when({
      condition: combineLatest(
        switches.map((switchDef) => switchDef.data.state.subject(scene)),
      ).pipe(map((states) => states.every(_.identity))),
      action: Flow.call(setGoalSpikes(true)),
    }),
    ...switches.map((switchDef) =>
      Flow.repeatWhen({
        condition: switchDef.data.state.subject,
        action: Flow.sequence(
          Flow.waitTimer(1500),
          Flow.call(switchDef.events.deactivateSwitch.emit({})),
        ),
      }),
    ),
  );
});

export const dungeonGoal1: Flow.PhaserNode = Flow.parallel(
  arrowCirclePuzzle,
  createGoal1,
  switchesForDoor4To5,
);
