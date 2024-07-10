import _ from "lodash";
import * as Phaser from "phaser";
import * as Wp from "../wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "../definitions";
import { declareGoInstance } from "/src/helpers/component";
import { makeGreenFlame, playerIsOnFlame } from "./goal-4-defs";
import { map, pairwise } from "rxjs/operators";
import {
  createFlameThrower,
  flameThrowerClass,
  hideFlameThrower,
  revealFlameThrower,
} from "../fireball";
import { BehaviorSubject } from "rxjs";

const startPuzzlePos: Wp.WpDef = { room: 0, x: 1, y: 1 };

const flame = makeGreenFlame({
  pos: { room: 4, x: 1, y: 3 },
  hintFrame: "hint-snail",
  nextPos: startPuzzlePos,
});

const solution: Phaser.Types.Math.Vector2Like[] = [
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 3, y: 2 },
  { x: 3, y: 3 },
  { x: 2, y: 3 },
  { x: 1, y: 3 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
];

const flameThrowers = _.range(1, 4).map((x) =>
  declareGoInstance(flameThrowerClass, null, {
    wp: { room: 0, x, y: 0 },
    orientation: 1,
    hidden: true,
  }),
);

const puzzleFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  let lines: Phaser.GameObjects.Line[] = [];

  const state = Flow.makeSceneStates();

  const resetAfterLeaveState = () =>
    Flow.lazy(() => {
      return Flow.sequence(
        Flow.parallel(
          ..._.map(flameThrowers, hideFlameThrower),
          Flow.tween({ targets: lines, props: { alpha: 0 } }),
          Flow.tween({
            targets: flame.instance.getObj(scene),
            props: { alpha: 1 },
          }),
        ),
        Flow.call(() => {
          lines.forEach((l) => l.destroy());
          lines = [];
        }),
        state.nextFlow(flameWaitingState()),
      );
    });

  const solvedState = () =>
    Flow.sequence(Flow.call(flame.instance.data.solved.setValue(true)));

  const flameActiveState = () =>
    Flow.lazy(() => {
      let nextPositions: Wp.WpId[] = [];
      const positions$: BehaviorSubject<Wp.WpId[]> = new BehaviorSubject<
        Wp.WpId[]
      >([]);

      function isSolved(positions: Wp.WpId[]): boolean {
        return _.isEqual(
          solution.map((v) => ({ ...v, room: 0 })),
          positions.map(Wp.getWpDef),
        );
      }

      return Flow.parallel(
        ..._.flatMap(flameThrowers, (flameThrower) => [
          revealFlameThrower(flameThrower),
          Flow.repeatSequence(
            Flow.waitTimer(4000),
            Flow.call(flameThrower.events.fire.emit({})),
          ),
        ]),
        Flow.tween({
          targets: flame.instance.getObj(scene),
          props: { alpha: 0 },
        }),
        Flow.whenTrueDo({
          condition: Def.player.data.currentPos.subject(scene).pipe(
            map(Wp.getWpDef),
            map(
              (pos) =>
                pos.room !== 0 ||
                pos.x < 1 ||
                pos.x > 3 ||
                pos.y < 1 ||
                pos.y > 3,
            ),
          ),
          action: state.nextFlow(resetAfterLeaveState()),
        }),
        Flow.whenTrueDo({
          condition: positions$.pipe(map(isSolved)),
          action: state.nextFlow(solvedState()),
        }),
        Flow.observe(
          Def.player.data.currentPos.dataSubject(scene).pipe(pairwise()),
          ([prevPosId, posId]) => {
            if (isSolved(nextPositions)) {
              return Flow.noop;
            }
            const prevPos = Wp.wpPos(Wp.getWpDef(prevPosId));
            const pos = Wp.wpPos(Wp.getWpDef(posId));
            const line = scene.add
              .line(0, 0, prevPos.x, prevPos.y, pos.x, pos.y, 0x338721)
              .setAlpha(0)
              .setLineWidth(5)
              .setOrigin(0);
            lines.push(line);
            nextPositions = nextPositions.concat(posId);
            return Flow.tween({
              targets: line,
              props: { alpha: 1, duration: 480 },
              // doing this now avoids changing state too early, which cause
              // the tween to be canceled
              onComplete: () => positions$.next(nextPositions),
            });
          },
        ),
      );
    });

  const flameWaitingState = (): Flow.PhaserNode =>
    Flow.sequence(
      Flow.waitTrue(playerIsOnFlame(flame.instance)),
      state.nextFlow(flameActiveState()),
    );

  return Flow.parallel(
    ..._.map(flameThrowers, createFlameThrower),
    state.start(flameWaitingState()),
  );
});

export const goal4Puzzle0 = {
  instance: flame,
  flow: puzzleFlow,
};
