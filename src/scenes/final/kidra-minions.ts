import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import {
  finalMinionClass,
  finalSceneClass,
} from "/src/scenes/final/final-defs";
import { makeSceneStates } from "/src/helpers/phaser-flow";
import { gameWidth } from "/src/scenes/common/constants";
import { declareGoInstance } from "/src/helpers/component";

const possibleRanges = [
  [120, 253],
  [826, 1002],
];

const minionFlow = (rPos: number): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const [minY, maxY] = possibleRanges[rPos];
    const minionObj = scene.physics.add
      .sprite(gameWidth + 100, Phaser.Math.Between(minY, maxY), "kidra-minion")
      .setScale(1.3);
    minionObj.play({ key: "kidra-minion-walk", repeat: -1 });
    minionObj.setVelocityX(-88);

    const inst = declareGoInstance(finalMinionClass, null);
    inst.create(minionObj);

    const state = makeSceneStates();

    function shootState(): Flow.PhaserNode {
      return Flow.lazy(() => {
        minionObj.stop();
        minionObj.disableBody();
        const y = minionObj.y;
        return Flow.sequence(
          Flow.withBackground({
            main: Flow.sequence(
              Flow.tween({
                targets: minionObj,
                props: { y: y - 200 },
                ease: Phaser.Math.Easing.Quadratic.Out,
                duration: 600,
              }),
              Flow.tween({
                targets: minionObj,
                ease: Phaser.Math.Easing.Quadratic.In,
                props: { y },
                duration: 600,
              }),
            ),
            back: Flow.tween({
              targets: minionObj,
              props: { angle: 360 },
              repeat: -1,
              duration: 200,
            }),
          }),
          Flow.tween({
            targets: minionObj,
            props: { angle: 90 },
            duration: 50,
          }),
          Flow.waitTimer(10000),
          Flow.tween({
            targets: minionObj,
            props: { alpha: 0 },
            duration: 1000,
          }),
          Flow.call(() => minionObj.destroy()),
          state.completeFlow,
        );
      });
    }

    let toEat = false;

    function walkState(): Flow.PhaserNode {
      return Flow.parallel(
        Flow.whenValueDo({
          condition: Flow.arcadeColliderSubject({
            object1: finalSceneClass.data.lightBalls.value(scene),
            object2: minionObj,
          }),
          action: () => state.nextFlow(shootState()),
        }),
        Flow.whenValueDo({
          condition: inst.events.eat.subject(scene),
          action: () => state.nextFlow(shootState()),
        }),
        Flow.onPostUpdate(() => () => {
          if (toEat) {
            return;
          }
          if (minionObj.x < 1000) {
            toEat = true;
            finalSceneClass.data.glurpTargets.value(scene).push(minionObj);
          }
        }),
      );
    }

    return state.start(walkState());
  });

export const kidraMinionsFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  let pos = 0;

  return Flow.whenValueDo({
    condition: finalSceneClass.events.kidraCallMinions.subject,
    action: () =>
      Flow.concurrent(
        Flow.wait(finalSceneClass.events.kidraDead.subject),
        Flow.repeatSequence(
          Flow.lazy(() => Flow.waitTimer(Phaser.Math.Between(500, 800))),
          Flow.spawn(
            Flow.lazy(() => {
              pos = 1 - pos;
              return minionFlow(pos);
            }),
          ),
        ),
      ),
  });
});
