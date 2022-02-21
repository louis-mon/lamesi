import * as Flow from "/src/helpers/phaser-flow";
import {
  goalPlane,
  LightSceneGoalDef,
  sceneDef,
  shadowName,
  vortexPlane,
} from "/src/scenes/lights/lights-def";
import { LightScene } from "/src/scenes/lights/lights";
import {
  findPreviousEvent,
  isEventReady,
  isEventSolved,
} from "/src/scenes/common/events-def";
import { colorTweenParams } from "/src/helpers/animate/tween/tween-color";
import { ManipulableObject, placeAt } from "/src/helpers/phaser";
import Phaser from "phaser";
import { solveLight } from "/src/scenes/lights/solve-light";
import { globalEvents } from "/src/scenes/common/global-events";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import { createKeyItem } from "/src/scenes/common/key-item";
import Vector2 = Phaser.Math.Vector2;
import { presentZoomTrack } from "/src/scenes/lights/zoomTracks";

export const createGoal = (goalDef: LightSceneGoalDef): Flow.PhaserNode =>
  Flow.lazy((s) => {
    const scene = s as LightScene;
    if (!isEventReady(goalDef.eventRequired)(s)) return Flow.noop;

    const initialTint = 0x4a4a4a;
    const go = goalDef.create(scene).setDepth(goalPlane).setTint(initialTint);
    scene.setCommonProps(go, goalDef);

    const isSolved = isEventSolved(goalDef.eventRequired)(s);

    const firstAppear = (): Flow.PhaserNode => {
      if (isSolved) return Flow.noop;

      const vortex = scene.add
        .ellipse(0, 0, go.width * 1.3, 50, 0x0000ff)
        .setScale(0)
        .setDepth(vortexPlane);
      const destY = go.y;
      placeAt(vortex, go.getBottomCenter());
      const curveObj = scene.add
        .graphics()
        .setVisible(false)
        .fillEllipse(vortex.x, vortex.y, vortex.width, vortex.height)
        .fillRect(0, 0, gameWidth, vortex.y);
      const mask = curveObj.createGeometryMask();
      const keyItem = createKeyItem(
        findPreviousEvent(goalDef.eventRequired),
        scene,
      );

      go.setMask(mask);

      go.y += go.height + vortex.height;
      return Flow.sequence(
        Flow.wait(globalEvents.subSceneEntered.subject),
        presentZoomTrack,
        keyItem.appearAt(new Vector2(gameWidth, gameHeight).scale(0.5)),
        keyItem.moveTo(vortex.getCenter()),
        Flow.parallel(
          keyItem.disappearAnim(),
          Flow.tween({
            targets: vortex,
            props: { scale: 1 },
            ease: Phaser.Math.Easing.Cubic.Out,
            duration: 1300,
          }),
        ),
        Flow.tween({
          targets: go,
          props: { y: destY },
          duration: 1500,
        }),
        Flow.tween({
          targets: vortex,
          props: { scale: 0 },
          ease: Phaser.Math.Easing.Cubic.In,
          duration: 1300,
        }),
        Flow.call(() => {
          go.clearMask(true);
          vortex.destroy();
          curveObj.destroy();
        }),
      );
    };

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

    return Flow.sequence(firstAppear(), detectSolution());
  });
