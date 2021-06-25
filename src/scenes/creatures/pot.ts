import Phaser from "phaser";

import {
  createImageAt,
  createSpriteAt,
  getObjectPosition,
  placeAt,
} from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { observeCommonGoEvent } from "/src/helpers/component";
import { getProp } from "/src/helpers/functional";
import * as Def from "./def";
import _ from "lodash";
import { Maybe } from "purify-ts";
import { MovedCurve } from "/src/helpers/math/curves";
import { makeControlledValue } from "/src/helpers/animate/tween";
import Vector2 = Phaser.Math.Vector2;

type VineController = {
  retract: () => Flow.PhaserNode;
  curve: Phaser.Curves.Curve;
};

type BudState = {
  sprite: Phaser.GameObjects.Sprite;
  initialPos: number;
  readyToBloom: boolean;
  bloomParticles?: Phaser.GameObjects.Particles.ParticleEmitter;
};

type RootStepState = {
  position: number;
  depth: number;
  bud: BudState;
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
  const points = curve.getPoints(50);
  return makeControlledValue({
    startValue: 0,
    setter: (rootExtent) => {
      rope.setPoints(_.take(points, Math.max(2, rootExtent * points.length)));
      rope.setDirty().setVisible(true);
    },
  });
};

const makePathFollower = ({
  curve,
  obj,
}: {
  curve: Phaser.Curves.Path;
  obj: Phaser.GameObjects.Components.Transform;
}) => {
  return makeControlledValue({
    startValue: 1,
    setter: (extent) => {
      const pos = curve.getPoint(extent);
      placeAt(obj, pos);
    },
  });
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

  const budStates = _.range(totalBuds).map<BudState>((i) => {
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
      readyToBloom: false,
    };
  });

  const potState = Flow.makeSceneStates();

  const bloomParticles = scene.add
    .particles("pot", "root-bulb")
    .setDepth(Def.depths.potFront);

  const activateBulb = ({
    rootPaths,
    stepClicked,
    fromBud,
  }: {
    rootPaths: RootStepsDeployed;
    stepClicked: RootStepState;
    fromBud: BudState;
  }): Flow.PhaserNode =>
    Flow.lazy(() => {
      const isRightBulb = stepClicked.bud === fromBud;
      const lastSteps = _.last(rootPaths)!;
      const retractBulbs = Flow.parallel(
        ...lastSteps.map((lastStep) =>
          Flow.tween({
            targets: lastStep.bulb,
            props: { scale: 0 },
            duration: 500,
          }),
        ),
      );

      const bulbClicked = stepClicked.bulb!;

      const getStepsFromStart = (step: RootStepState): RootStepState[] =>
        Maybe.fromNullable(step.prev)
          .map(getStepsFromStart)
          .orDefault([])
          .concat(step);
      const stepsFromStart = getStepsFromStart(stepClicked);

      const reverseCurve = new Phaser.Curves.Path(0, 0);
      stepsFromStart.forEach((step) => {
        Maybe.fromNullable(step.vine).ifJust((vine) =>
          reverseCurve.add(
            new MovedCurve(vine.curve, getPositionOfRootState(step.prev!)),
          ),
        );
      });

      const budReceiveEnergyDuration = 60;
      const moveEnergy = Flow.lazy(() => {
        const energyObj = createImageAt(
          scene,
          getObjectPosition(bulbClicked),
          bulbClicked.texture.key,
          bulbClicked.frame.name,
        ).setDepth(Def.depths.potRoot);
        return Flow.sequence(
          Flow.tween({
            targets: makePathFollower({ curve: reverseCurve, obj: energyObj }),
            props: { value: 0 },
            duration: 1300,
          }),
          Flow.call(() => energyObj.destroy()),
          Flow.tween({
            targets: stepClicked.bud.sprite,
            props: { scale: 1.4 },
            duration: budReceiveEnergyDuration,
            yoyo: true,
          }),
        );
      });

      const moveAllEnergyRec = (n: number): Flow.PhaserNode =>
        Flow.lazy(() =>
          n === 0
            ? Flow.noop
            : Flow.parallel(
                moveEnergy,
                Flow.sequence(
                  Flow.waitTimer(budReceiveEnergyDuration * 3),
                  moveAllEnergyRec(n - 1),
                ),
              ),
        );

      const moveAllEnergy = isRightBulb ? moveAllEnergyRec(8) : Flow.noop;

      const makeReadyToBloom = () => {
        fromBud.bloomParticles = bloomParticles.createEmitter({
          follow: fromBud.sprite,
          "followOffset.y": fromBud.sprite.height / 2,
          alpha: { end: 0, start: 1 },
          angle: { min: -25, max: -155 },
          scale: { start: 0.7, end: 0 },
          lifespan: 500,
          frequency: 70,
          speed: 100,
        });
      };

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

      return Flow.sequence(
        Flow.parallel(moveAllEnergy, retractBulbs),
        Flow.call(makeReadyToBloom),
        ...retractVines,
      );
    });

  const developRoots = (fromBud: BudState): Flow.PhaserNode =>
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
                const splinePoints: [Vector2, Vector2, Vector2, Vector2] = [
                  new Vector2(0, 0),
                  new Vector2(0, hspaceDepth / 2),
                  new Vector2(destPos.x, hspaceDepth / 2),
                  destPos,
                ];
                const spline = new Phaser.Curves.CubicBezier(...splinePoints);
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
                  curve: spline,
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
