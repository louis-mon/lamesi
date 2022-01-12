import * as Flow from "/src/helpers/phaser-flow";
import {
  goalPlane,
  LightSceneGoalDef,
  sceneDef,
  shadowName,
} from "/src/scenes/lights/lights-def";
import { LightScene } from "/src/scenes/lights/lights";
import { isEventReady, isEventSolved } from "/src/scenes/common/events-def";
import { colorTweenParams } from "/src/helpers/animate/tween/tween-color";
import { ManipulableObject } from "/src/helpers/phaser";
import Phaser from "phaser";
import { solveLight } from "/src/scenes/lights/solve-light";
import { globalEvents } from "/src/scenes/common/global-events";

export const createGoal = (goalDef: LightSceneGoalDef): Flow.PhaserNode =>
  Flow.lazy((s) => {
    const scene = s as LightScene;
    if (!isEventReady(goalDef.eventRequired)(s)) return Flow.noop;

    const initialTint = 0x4a4a4a;
    const go = goalDef
      .create(scene)
      .setDepth(goalPlane)
      .setTint(initialTint)
      .setAlpha(0);
    scene.setCommonProps(go, goalDef);

    const isSolved = isEventSolved(goalDef.eventRequired)(s);

    const firstAppear: Flow.PhaserNode = Flow.sequence(
      isSolved ? Flow.noop : Flow.wait(globalEvents.subSceneEntered.subject),
      Flow.tween({
        targets: go,
        props: { alpha: 1 },
        duration: isSolved ? 0 : 2000,
      }),
    );

    const isGoalReached = () =>
      goalDef.requires.every(({ materialKey, position, width }) =>
        sceneDef.lights.some((lightDef) => {
          const shadow = scene.children.getByName(
            shadowName(materialKey, lightDef),
          ) as ManipulableObject;
          if (!shadow) return false;
          const sizeMatch = Phaser.Math.Within(shadow.displayWidth, width, 10);
          return (
            sizeMatch &&
            new Phaser.Geom.Circle(position.x, position.y, 10).contains(
              shadow.x,
              shadow.y,
            )
          );
        }),
      );

    const holdReachGoal = (): Flow.PhaserNode =>
      Flow.sequence(
        Flow.tween({
          ...colorTweenParams({
            targets: go,
            propName: "tint",
            value: 0xf6f112,
          }),
          ease: Phaser.Math.Easing.Sine.InOut,
          duration: 600,
        }),
        Flow.parallel(
          Flow.sequence(
            Flow.waitTimer(2400),
            goalState.nextFlow(solveLight({ goalDef, target: go })),
          ),
          Flow.handlePostUpdate({
            handler: () => () => {
              if (!isGoalReached()) {
                goalState.next(
                  Flow.sequence(
                    Flow.tween({
                      ...colorTweenParams({
                        targets: go,
                        propName: "tint",
                        value: initialTint,
                      }),
                      ease: Phaser.Math.Easing.Sine.InOut,
                      duration: 600,
                    }),
                    detectSolution(),
                  ),
                );
              }
            },
          }),
        ),
      );

    const detectSolution = (): Flow.PhaserNode =>
      goalState.start(
        Flow.handlePostUpdate({
          handler: () => () => {
            if (isGoalReached()) {
              goalState.next(holdReachGoal());
            }
          },
        }),
      );

    const goalState = Flow.makeSceneStates();

    return Flow.parallel(firstAppear, detectSolution());
  });
