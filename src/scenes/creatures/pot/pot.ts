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
import * as Def from "../def";
import _, { sortBy } from "lodash";
import { Maybe } from "purify-ts";
import { MovedCurve } from "/src/helpers/math/curves";
import { makeControlledValue } from "/src/helpers/animate/tween";
import Vector2 = Phaser.Math.Vector2;
import { potSceneClass } from "/src/scenes/creatures/pot/pot-def";
import { createMandibles } from "/src/scenes/creatures/pot/mandibles";
import { bodyPartsConfig } from "../def";
import {
  findPreviousEvent,
  isEventReady,
  isEventSolved,
} from "/src/scenes/common/events-def";
import { createKeyItem } from "/src/scenes/common/key-item";
import { globalEvents } from "/src/scenes/common/global-events";
import {
  manDeskPos,
  moveMan,
  setToWaitingState,
} from "/src/scenes/creatures/man";
import { cutscene } from "/src/scenes/common/cutscene";

type VineController = {
  retract: () => Flow.PhaserNode;
  curve: Phaser.Curves.Curve;
};

type BudState = {
  sprite: Phaser.GameObjects.Sprite;
  initialPos: number;
  hasBloomed: boolean;
  flowState: Flow.SceneStatesFlow;
};

type RootStepState = {
  position: number;
  depth: number;
  bud: BudState;
  prev: RootStepState | null;
  bulb?: Phaser.GameObjects.Sprite;
  bulbButton?: Phaser.GameObjects.GameObject;
  vine?: VineController;
};

type RootStepsDeployed = RootStepState[][];

const totalDepth = 5;
const totalBuds = 3;
const nbPtPerFloor = 1 + (totalBuds - 1) * 2 ** Math.floor(totalDepth / 2);
const potPosition = new Vector2(400, 370);
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

export const potFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  createImageAt(scene, potPosition, "pot", "pot-cut").setDepth(
    Def.depths.potCut,
  );
  const potFront = createImageAt(
    scene,
    potPosition,
    "pot",
    "pot-front",
  ).setDepth(Def.depths.potFront);

  const xStart = 86;
  const xEnd = 412;
  const anchorPositions = _.range(totalDepth).map((depth) =>
    _.range(nbPtPerFloor).map((posInFloor) =>
      potFront
        .getTopLeft()
        .clone()
        .add(
          new Vector2(
            xStart + (posInFloor * (xEnd - xStart)) / (nbPtPerFloor - 1),
            94 + hspaceDepth * depth,
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
        .setScale(0)
        .setInteractive(),
      initialPos,
      hasBloomed: false,
      flowState: Flow.makeSceneStates(),
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
    fromBud: BudState;
  }): Flow.PhaserNode =>
    Flow.lazy(() => {
      const isRightBulb = stepClicked.bud === fromBud;
      const lastSteps = _.last(rootPaths)!;
      const retractBulbs = Flow.parallel(
        ...lastSteps.map((lastStep) =>
          Flow.sequence(
            Flow.tween({
              targets: lastStep.bulb,
              props: { scale: 0 },
              duration: 500,
            }),
            Flow.call(() => {
              lastStep.bulb?.destroy();
              lastStep.bulbButton?.destroy();
            }),
          ),
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
        if (isRightBulb) {
          fromBud.hasBloomed = true;
          fromBud.flowState.next(bloomMandibles(fromBud));
        }
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
        potState.nextFlow(afterBulbActivated),
      );
    });

  const afterBulbActivated: Flow.PhaserNode = Flow.lazy(() => {
    if (budStates.every((state) => state.hasBloomed)) return takeAllMandibles;
    return waitForBulbClicked();
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
              .setScale(0.1);
            const bulbButton = scene.add
              .circle(bulbPos.x, bulbPos.y, bulb.width * 0.6, undefined, 0)
              .setDepth(Def.depths.potRoot)
              .setInteractive();
            rootStep.bulb = bulb;
            rootStep.bulbButton = bulbButton;

            return Flow.parallel(
              Flow.sequence(
                Flow.tween({
                  targets: bulb,
                  props: { scale: 0.8 },
                  duration: 200,
                }),
                Flow.tween({
                  targets: bulb,
                  props: { scale: 1.2 },
                  ease: Phaser.Math.Easing.Sine.In,
                  yoyo: true,
                  repeat: -1,
                  duration: 610,
                }),
              ),
              Flow.observe(
                observeCommonGoEvent(bulbButton, "pointerdown"),
                () =>
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

  const waitForBulbClicked = (): Flow.PhaserNode =>
    Flow.waitOnOfPointerdown({
      items: budStates.filter((bud) => !bud.hasBloomed),
      getObj: getProp("sprite"),
      nextFlow: (bud) => potState.nextFlow(developRoots(bud)),
    });

  const bloomMandibles = (fromBud: BudState): Flow.PhaserNode => {
    const retractBud = Flow.tween({
      targets: fromBud.sprite,
      props: { scale: 0 },
      duration: 620,
    });
    return Flow.sequence(
      retractBud,
      createMandibles({
        pos: () => getObjectPosition(fromBud.sprite),
        rotation: () => 0,
      }),
    );
  };

  const takeAllMandibles = Flow.call(
    potSceneClass.events.pickAllMandibles.emit({}),
  );

  const budFlows = Flow.parallel(
    ...budStates.map((bud) => bud.flowState.start()),
  );

  const growBulbs = (): Flow.PhaserNode => {
    const eventKey = bodyPartsConfig.mouth.requiredEvent;
    if (!isEventReady(eventKey)(scene)) return Flow.noop;
    const targetScale = 1;
    if (isEventSolved(eventKey)(scene)) {
      budStates.forEach((bud) => bud.sprite.setScale(targetScale));
      return Flow.noop;
    }
    const budsOrder = sortBy(budStates, (b) => b.sprite.x).reverse();
    const seeds = budsOrder.map(() =>
      createKeyItem(findPreviousEvent(eventKey), scene),
    );
    const manItinerary: Vector2[] = [
      new Vector2(670, 950),
      potFront.getTopRight(),
    ];
    return Flow.sequence(
      Flow.wait(globalEvents.subSceneEntered.subject),
      cutscene(
        Flow.sequence(
          ...manItinerary.map((dest) => moveMan({ dest })),
          Flow.parallel(
            ...budsOrder.map((budState, i) => {
              const keyItem = seeds[i];
              keyItem.obj.setDepth(Def.depths.potFront);
              return keyItem.downAnim(budState.sprite.getBottomCenter());
            }),
          ),
          ...budsOrder.map((budState, i) =>
            Flow.lazy(() => {
              const keyItem = seeds[i];
              return Flow.sequence(
                moveMan({
                  dest: keyItem.obj
                    .getTopRight()
                    .clone()
                    .add(new Vector2(30, 0)),
                }),
                keyItem.disappearAnim(),
                Flow.tween({
                  targets: budState.sprite,
                  props: { scale: targetScale },
                }),
              );
            }),
          ),
          ...manItinerary
            .slice()
            .reverse()
            .concat(manDeskPos)
            .map((dest) => moveMan({ dest })),
          setToWaitingState,
          potState.nextFlow(waitForBulbClicked()),
        ),
      ),
    );
  };

  return Flow.parallel(potState.start(growBulbs()), budFlows);
});
