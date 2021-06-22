import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;
import Color = Phaser.Display.Color;

import {
  createSpriteAt,
  vecToXY,
  createImageAt,
  placeAt,
  addPhysicsFromSprite,
  ManipulableObject,
  getObjectPosition,
  getPointerPosInMainCam,
} from "/src/helpers/phaser";
import { subWordGameBeginEvent, gameWidth, gameHeight } from "../common";
import * as Flow from "/src/helpers/phaser-flow";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  customEvent,
  spriteClassKind,
  commonGoEvents,
  observeCommonGoEvent,
} from "/src/helpers/component";
import { combineContext, getProp } from "/src/helpers/functional";
import { combineLatest, fromEvent } from "rxjs";
import { map } from "rxjs/operators";
import * as Def from "./def";
import _ from "lodash";
import { followPosition, followRotation } from "/src/helpers/animate/composite";
import { Maybe } from "purify-ts";
import { makeStatesFlow } from "/src/helpers/animate/flow-state";

type VineController = {
  retract: () => Flow.PhaserNode;
};

type RootStepState = {
  position: number;
  depth: number;
  bud: unknown;
  prev: RootStepState | null;
  bulb?: Phaser.GameObjects.Sprite;
  vine?: VineController;
};

type RootStepsDeployed = RootStepState[][];

const totalDepth = 5;
const totalBuds = 3;
const nbPtPerFloor = 1 + (totalBuds - 1) * 2 ** (totalDepth / 2);
const potPosition = new Vector2(400, 300);
const hspaceDepth = 250 / (totalDepth - 1);

const makeRopeCurveController = ({
  curve,
  rope,
}: {
  curve: Phaser.Curves.Curve;
  rope: Phaser.GameObjects.Rope;
}) => {
  let rootExtent = 0;
  const points = curve.getPoints(50);
  return {
    get value() {
      return rootExtent;
    },
    set value(newValue: number) {
      rootExtent = newValue;
      rope.setPoints(_.take(points, Math.max(2, rootExtent * points.length)));
      rope.setDirty().setVisible(true);
    },
  };
};

export const createPot: Flow.PhaserNode = Flow.lazy((scene) => {
  const potCut = createImageAt(scene, potPosition, "pot", "pot-cut").setDepth(
    Def.depths.potCut,
  );
  const potFront = createImageAt(
    scene,
    potPosition,
    "pot",
    "pot-front",
  ).setDepth(Def.depths.potFront);

  const anchorPositions = _.range(totalDepth).map((depth) =>
    _.range(nbPtPerFloor).map((posInFloor) =>
      potFront
        .getTopCenter()
        .clone()
        .add(
          new Vector2(
            (-(nbPtPerFloor - 1) / 2 + posInFloor) * (325 / (nbPtPerFloor - 1)),
            37 + hspaceDepth * depth,
          ),
        ),
    ),
  );

  const getPositionOfRootState = (state: RootStepState) =>
    anchorPositions[state.depth][state.position];

  const budStates = _.range(totalBuds).map((i) => {
    const initialPos = Math.floor(((i + 0.5) / totalBuds) * nbPtPerFloor);
    return {
      sprite: createSpriteAt(
        scene,
        anchorPositions[0][initialPos].clone(),
        "pot",
        "bud",
      )
        .setOrigin(0.5, 1)
        .setDepth(Def.depths.potBud)
        .setInteractive(),
      initialPos,
    };
  });

  const potState = Flow.makeSceneStates();

  const activateBulb = ({
    rootPaths,
    stepClicked,
    fromBud,
  }: {
    rootPaths: RootStepsDeployed;
    stepClicked: RootStepState;
    fromBud: unknown;
  }): Flow.PhaserNode =>
    Flow.lazy(() => {
      const isRightBulb = stepClicked.bud === fromBud;
      const lastSteps = _.last(rootPaths)!;
      const retractBulbs = Flow.parallel(
        ...lastSteps.map((lastStep) =>
          Flow.tween({
            targets: lastStep.bulb,
            props: { scale: lastStep === stepClicked && isRightBulb ? 2 : 0 },
            duration: 500,
          }),
        ),
      );

      const retractVines = rootPaths
        .slice()
        .reverse()
        .map((rowSteps) =>
          Flow.parallel(
            ...rowSteps.map((step) =>
              Maybe.fromNullable(step.vine)
                .map((x) => x.retract())
                .orDefault(Flow.noop),
            ),
          ),
        );

      return Flow.sequence(retractBulbs, ...retractVines);
    });

  const developRoots = (fromBud: unknown): Flow.PhaserNode =>
    Flow.lazy(() => {
      const rootPaths = _.range(1, totalDepth).reduce(
        (prevStates, depth) =>
          prevStates.concat([
            Phaser.Math.RND.shuffle(
              _.flatMap(_.last(prevStates), (state) =>
                state.bud === fromBud || depth % 2 === 1
                  ? [state]
                  : [state, state],
              ),
            ).reduce<Array<RootStepState>>(
              (newRoots, state) =>
                newRoots.concat([
                  {
                    bud: state.bud,
                    depth,
                    prev: state,
                    position: Phaser.Math.RND.pick(
                      _.difference(
                        _.range(anchorPositions[depth].length),
                        newRoots.map(getProp("position")),
                      ),
                    ),
                  },
                ]),
              [],
            ),
          ]),
        [
          budStates.map<RootStepState>((bud) => ({
            depth: 0,
            bud,
            position: bud.initialPos,
            prev: null,
          })),
        ],
      );

      const developBulbs = Flow.lazy(() =>
        Flow.parallel(
          ..._.last(rootPaths)!.map((rootStep) => {
            const bulbPos = getPositionOfRootState(rootStep);
            const bulb = scene.add
              .sprite(bulbPos.x, bulbPos.y, "pot", "root-bulb")
              .setDepth(Def.depths.potRoot)
              .setScale(0.1)
              .setInteractive();
            rootStep.bulb = bulb;

            return Flow.parallel(
              Flow.sequence(
                Flow.tween({
                  targets: bulb,
                  props: { scale: 0.5 },
                  duration: 200,
                }),
                Flow.tween({
                  targets: bulb,
                  props: { scale: 1.2 },
                  ease: Phaser.Math.Easing.Sine.In,
                  yoyo: true,
                  repeat: -1,
                  duration: 410,
                }),
              ),
              Flow.observe(observeCommonGoEvent(bulb, "pointerdown"), () =>
                potState.nextFlow(
                  activateBulb({ rootPaths, fromBud, stepClicked: rootStep }),
                ),
              ),
            );
          }),
        ),
      );

      return Flow.sequence(
        Flow.tween({
          targets: potFront,
          props: { alpha: 0 },
          duration: 700,
        }),
        ...rootPaths.map((rootSteps) =>
          Flow.parallel(
            ...rootSteps.map((rootStep) =>
              Flow.lazy(() => {
                if (rootStep.prev === null) return Flow.noop;
                const lastPos = getPositionOfRootState(rootStep.prev);
                const nextPos = getPositionOfRootState(rootStep);
                const destPos = nextPos.clone().subtract(lastPos);
                const spline = new Phaser.Curves.CubicBezier(
                  new Vector2(0, 0),
                  new Vector2(0, hspaceDepth / 2),
                  new Vector2(destPos.x, hspaceDepth / 2),
                  destPos,
                );
                const rootObj = scene.add
                  .rope(lastPos.x, lastPos.y, "pot", "root")
                  .setVisible(false)
                  .setDepth(Def.depths.potRoot);

                const ropeController = makeRopeCurveController({
                  curve: spline,
                  rope: rootObj,
                });
                const duration = 450;
                rootStep.vine = {
                  retract: () =>
                    Flow.sequence(
                      Flow.tween({
                        targets: ropeController,
                        props: { value: 0 },
                        duration,
                      }),
                      Flow.call(() => rootObj.destroy()),
                    ),
                };
                return Flow.tween({
                  targets: ropeController,
                  props: { value: 1 },
                  duration,
                });
              }),
            ),
          ),
        ),
        developBulbs,
      );
    });

  return potState.start(
    Flow.parallel(
      ...budStates.map((bud) =>
        Flow.sequence(
          Flow.wait(observeCommonGoEvent(bud.sprite, "pointerdown")),
          potState.nextFlow(developRoots(bud)),
        ),
      ),
    ),
  );
});
