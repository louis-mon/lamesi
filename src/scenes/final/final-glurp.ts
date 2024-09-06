import * as Flow from "/src/helpers/phaser-flow";
import { makeSceneStates } from "/src/helpers/phaser-flow";
import { creatureSceneClass } from "/src/scenes/creatures/def";
import {
  finalMinionClass,
  finalSceneClass,
  glurpInitPos,
} from "/src/scenes/final/final-defs";
import { gameHeight } from "/src/scenes/common/constants";
import { createGlurp } from "/src/scenes/creatures/glurp";
import { getCoordProps } from "/src/helpers/phaser";
import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

function watchEatKidra(index: number): Flow.PhaserNode {
  return Flow.lazy((scene) => {
    const state = makeSceneStates();

    function runEatKidra(kidra: Phaser.Physics.Arcade.Sprite) {
      return Flow.sequence(
        eatKidra({ index, kidra }),
        state.nextFlow(watchIfAvailable()),
      );
    }

    function watchIfAvailable() {
      return Flow.onPostUpdate(() => () => {
        const targets = finalSceneClass.data.glurpTargets.value(scene);
        const [toEat] = targets;
        if (!toEat) {
          return;
        }
        const matchIndex = toEat.y < gameHeight / 2 ? 1 : 2;
        if (index === matchIndex) {
          targets.shift();
          state.next(runEatKidra(toEat));
        }
      });
    }

    return state.start(watchIfAvailable());
  });
}

function eatKidra({
  index,
  kidra,
}: {
  index: number;
  kidra: Phaser.Physics.Arcade.Sprite;
}): Flow.PhaserNode {
  return Flow.lazy((scene) => {
    const glurpControl = creatureSceneClass.data.glurpControl.value(scene);
    const glurpObj = creatureSceneClass.data.glurpObj.value(scene);
    const mouthPos = new Vector2();

    const localMatrix = glurpObj.getWorldTransformMatrix();

    let orgPos: null | Vector2 = null;
    const bodyKey = `mouth-${index}`;
    glurpControl[bodyKey] = (org) => {
      if (!orgPos) {
        mouthPos.copy(org);
        orgPos = org.clone();
      }
      return mouthPos;
    };
    const eatDuration = 300;
    return Flow.sequence(
      Flow.waitTimer(10),
      Flow.tween({
        targets: mouthPos,
        props: getCoordProps(
          localMatrix.applyInverse(kidra.x, kidra.y, new Vector2()) as Vector2,
        ),
        duration: eatDuration,
      }),
      Flow.call(() => {
        finalMinionClass.events.eat(kidra.name).emit({})(scene);
      }),
      Flow.tween(() => ({
        targets: mouthPos,
        props: getCoordProps(orgPos!),
        duration: eatDuration,
      })),
      Flow.call(() => {
        delete glurpControl[bodyKey];
      }),
    );
  });
}

export const finalGlurpFlow: Flow.PhaserNode = Flow.parallel(
  createGlurp({ pos: glurpInitPos, rotation: Math.PI / 2 }),
  Flow.sequence(
    Flow.waitTimer(1000),
    Flow.lazy((scene) => {
      const glurpObj = creatureSceneClass.data.glurpObj.value(scene);
      finalSceneClass.data.attack.setValue({
        particles: scene.add
          .particles("fight", "light-particle")
          .setDepth(1000),
      })(scene);
      return Flow.moveTo({
        target: glurpObj,
        dest: new Vector2(620, gameHeight / 2),
        speed: 200,
      });
    }),
    Flow.parallel(watchEatKidra(1), watchEatKidra(2)),
  ),
);
