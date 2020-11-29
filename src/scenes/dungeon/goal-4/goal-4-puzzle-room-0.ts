import _ from "lodash";
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
import {
  customEvent,
  declareGoInstance,
  defineSceneClass,
  makeSceneEventHelper,
  spriteClassKind,
} from "/src/helpers/component";
import {
  hintFlameRoom5,
  makeGreenFlame,
  moveFlameTo,
  playerIsOnFlame,
} from "./goal-4-defs";
import { distinct, map, pairwise } from "rxjs/operators";
import {
  createFlameThrower,
  flameThrowerClass,
  hideFlameThrower,
  revealFlameThrower,
} from "../fireball";

const flame = makeGreenFlame({
  // pos: { room: 0, x: 1, y: 2 }, for testing
  pos: { room: 4, x: 1, y: 3 },
  hintFrame: "hint-snail",
  nextPos: { room: 0, x: 1, y: 1 },
});

const puzzleState = defineSceneClass({
  events: {
    goal4Room0Puzzle: customEvent<Flow.PhaserNode>(),
  },
  data: {},
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
  let positions: Wp.WpId[] = [];

  const emitState = (state: Flow.PhaserNode): Flow.PhaserNode =>
    Flow.call(puzzleState.events.goal4Room0Puzzle.emit(state));

  const checkSolveState = () =>
    Flow.lazy(() => {
      if (
        _.isEqual(
          solution.map((v) => ({ ...v, room: 0 })),
          positions.map(Wp.getWpDef),
        )
      ) {
        return Flow.call(flame.instance.data.solved.setValue(true));
      }
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
          positions = [];
        }),
        emitState(flameWaitingState()),
      );
    });

  const flameActiveState = () =>
    Flow.lazy(() =>
      Flow.parallel(
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
          action: emitState(checkSolveState()),
        }),
        Flow.observe(
          Def.player.data.currentPos.dataSubject(scene).pipe(pairwise()),
          ([prevPosId, posId]) => {
            const prevPos = Wp.wpPos(Wp.getWpDef(prevPosId));
            const pos = Wp.wpPos(Wp.getWpDef(posId));
            const line = scene.add
              .line(0, 0, prevPos.x, prevPos.y, pos.x, pos.y, 0x338721)
              .setAlpha(0)
              .setLineWidth(5)
              .setOrigin(0);
            lines.push(line);
            positions.push(posId);
            return Flow.tween({
              targets: line,
              props: { alpha: 1, duration: 480 },
            });
          },
        ),
      ),
    );

  const flameWaitingState = (): Flow.PhaserNode =>
    Flow.sequence(
      Flow.waitTrue(playerIsOnFlame(flame.instance)),
      emitState(flameActiveState()),
    );

  return Flow.parallel(
    ..._.map(flameThrowers, createFlameThrower),
    Flow.observeSentinel(
      puzzleState.events.goal4Room0Puzzle.subject,
      _.identity,
    ),
    emitState(flameWaitingState()),
  );
});

export const goal4Puzzle0 = {
  instance: flame,
  flow: puzzleFlow,
};
