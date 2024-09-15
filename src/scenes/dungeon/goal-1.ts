import * as Phaser from "phaser";
import _ from "lodash";
import { playerIsOnPos } from "./definitions";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "./definitions";

import { createImageAt } from "/src/helpers/phaser";
import * as Npc from "./npc";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  customEvent,
} from "/src/helpers/component";
import { combineContext } from "/src/helpers/functional";
import { combineLatest } from "rxjs";
import { map } from "rxjs/operators";
import { arrowSkillAltar } from "./skills";
import { hintFlameRoom5 } from "./goal-4/goal-4-defs";
import { globalData } from "../common/global-data";
import {
  altarAppearCutscene,
  dungeonCutscene,
} from "/src/scenes/dungeon/dungeon-cutscene";

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
        const getAltValue = (i: number) =>
          getRotateMechDef(mechanisms[i].switchDef.key).data.alt.value(scene);

        function getNextIndices() {
          const startIndex = 1;
          const endIndex = 2;
          const altMechanismIndices = [startIndex, endIndex];
          const altBytes = altMechanismIndices.map(
            (i) => (getAltValue(i) ? 1 : 0) << (endIndex - i),
          );
          const nextFlags = _.sum(altBytes) + 1;
          return altMechanismIndices.filter((i) => {
            const activeNext = !!(nextFlags & (1 << (endIndex - i)));
            return activeNext !== getAltValue(i);
          });
        }

        return Flow.sequence(
          Flow.parallel(
            ...getNextIndices().map((i) => {
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
    action: altarAppearCutscene({
      wp: { room: 5, x: 4, y: 0 },
      altarAppear: arrowSkillAltar,
      beforeAltar: Flow.sequence(
        Flow.tween({ targets: hint, props: { alpha: 0 } }),
        Flow.call(() => hint.destroy()),
      ),
    }),
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
        globalData.dungeonPhase2.value(scene)
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
  const goalAltarWp = { room: 4, x: 2, y: 1 };
  const goalAltar = Npc.endGoalAltarPlaceholder({
    wp: goalAltarWp,
    eventToSolve: "dungeonPhase1",
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
      action: dungeonCutscene({
        targetWp: goalAltarWp,
        inCutscene: Flow.call(setGoalSpikes(true)),
      }),
    }),
    ...switches.map((switchDef) =>
      Flow.repeatWhen({
        condition: switchDef.data.state.subject,
        action: Flow.sequence(
          Flow.waitTimer(1500),
          Flow.call(switchDef.events.deactivateSwitch.emit({ feedback: true })),
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
