import * as Phaser from "phaser";
import _ from "lodash";
import { playerIsOnPos } from "./definitions";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import {
  createSpriteAt,
  vecToXY,
  createImageAt,
  placeAt,
} from "/src/helpers/phaser";
import * as Npc from "./npc";
import { makeMenu } from "./menu";
import {
  subWordGameBeginEvent,
  gameWidth,
  gameHeight,
} from "../common/constants";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  customEvent,
} from "/src/helpers/component";
import { combineContext, getProp } from "/src/helpers/functional";
import { combineLatest } from "rxjs";
import { map, tap } from "rxjs/operators";
import { arrowSkillAltar } from "./skills";
import { menuHelpers } from "../menu";
import { tintProxy } from "/src/helpers/animate/tween";
import { Maybe } from "purify-ts";
import { hintFlameRoom5 } from "./goal-4/goal-4-defs";
import { globalData } from "../common/global-data";

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
      alt: annotate<boolean>(),
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

  const mechTextureFrame = (i: number, alt: boolean) =>
    `symbol-circle-${i + 1}${alt ? "-alt" : ""}`;

  const switchFlows = mechanisms.map(({ switchDef, startTurn }, i) => {
    Npc.switchCrystalFactory(scene)(switchDef);
    const rotateDef = getRotateMechDef(switchDef.key);
    const rotateObj = rotateDef.create(
      createImageAt(
        scene,
        Wp.wpPos({ room: 5, x: 2, y: 2 }),
        "npc",
        mechTextureFrame(i, false),
      )
        .setDepth(Def.depths.carpet)
        .setAngle(getRotateMechAngle(startTurn)),
    );
    rotateObj.tintFill = false;
    const turnData = rotateDef.data.turn;
    turnData.setValue(startTurn)(scene);
    rotateDef.data.alt.setValue(false)(scene);
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

  const altSwitchFlow = Flow.sequence(
    Flow.wait(Def.scene.events.showAltSwitchInRoom5.subject),
    Flow.call(() =>
      Npc.switchCrystalFactory(scene)(Def.switches.room5AltPanel),
    ),
    Flow.repeatWhen({
      condition: Def.switches.room5AltPanel.data.state.subject,
      action: Flow.lazy(() => {
        const altIndex = [1, 2].find((i) =>
          getRotateMechDef(mechanisms[i].switchDef.key).data.alt.value(scene),
        );
        return Flow.sequence(
          Flow.parallel(
            ...Maybe.fromNullable(altIndex)
              .map((i) => (mechanisms[i + 1] ? [i, i + 1] : [i]))
              .orDefault([1])
              .map((i) => {
                const mech = getRotateMechDef(mechanisms[i].switchDef.key);
                const mechObj = mech.getObj(scene);
                const duration = 520;

                return Flow.sequence(
                  Flow.tween({
                    targets: mechObj,
                    props: { alpha: 0 },
                    duration,
                  }),
                  Flow.call(mech.data.alt.updateValue((value) => !value)),
                  Flow.call(() =>
                    mechObj.setFrame(
                      mechTextureFrame(i, mech.data.alt.value(scene)),
                    ),
                  ),
                  Flow.tween(() => ({
                    targets: mechObj,
                    props: { alpha: 1 },
                    duration,
                  })),
                );
              }),
          ),
          Flow.call(
            Def.switches.room5AltPanel.events.deactivateSwitch.emit({}),
          ),
        );
      }),
    }),
  );

  const checkSolvePuzzle = (solution: Array<[number, boolean]>) =>
    combineLatest(
      mechanisms.map(({ switchDef }, i) => {
        const rotateDef = getRotateMechDef(switchDef.key);
        return combineLatest([
          rotateDef.data.turn.dataSubject(scene),
          rotateDef.data.alt.dataSubject(scene),
        ]);
      }),
    ).pipe(map((mechStates) => _.isEqual(mechStates, solution)));

  const solvePuzzle = Flow.whenTrueDo({
    condition: checkSolvePuzzle([
      [0, false],
      [0, false],
      [0, false],
    ]),
    action: Flow.sequence(
      Flow.tween({ targets: hint, props: { alpha: 0 } }),
      Flow.call(() => hint.destroy()),
      arrowSkillAltar({ wp: { room: 5, x: 4, y: 0 } }),
    ),
  });

  const solveFishPuzzle = Flow.whenTrueDo({
    condition: checkSolvePuzzle([
      [1, false],
      [1, true],
      [4, false],
    ]),
    action: Flow.call(hintFlameRoom5.instance.data.solved.setValue(true)),
  });

  return Flow.parallel(
    ...switchFlows,
    altSwitchFlow,
    solvePuzzle,
    solveFishPuzzle,
  );
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
    Flow.whenTrueDo({
      condition: Def.switches.room4ForRoom5Door.data.state.subject,
      action: Npc.openDoor("door4To5"),
    }),
    Flow.whenTrueDo({
      condition: Def.switches.room5ForRoom4Door.data.state.subject,
      action: Npc.openDoor("door4To5"),
    }),
    Flow.whenTrueDo({
      condition: playerIsOnPos({ room: 5, x: 0, y: 2 }),
      action: Flow.lazy((scene) =>
        globalData.dungeonPhase1.value(scene)
          ? Flow.noop
          : Npc.closeDoor("door4To5"),
      ),
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
    wp: { room: 4, x: 2, y: 1 },
    n: 1,
  });
  const setGoalSpikes = (open: boolean) =>
    Wp.setGroundObstacleRect({
      wp1: { x: 2, y: 1 },
      wp2: { x: 3, y: 2 },
      room: 4,
      kind: open ? "none" : "spike",
    });
  setGoalSpikes(false)(scene);
  return Flow.parallel(
    goalAltar,
    Flow.whenTrueDo({
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
