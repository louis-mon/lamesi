import * as Flow from "/src/helpers/phaser-flow";
import { globalEvents } from "/src/scenes/common/global-events";
import { creatureSceneClass } from "/src/scenes/creatures/def";
import Vector2 = Phaser.Math.Vector2;
import { gameHeight } from "/src/scenes/common/constants";
import { createGlurp } from "/src/scenes/creatures/glurp";
import { finalSceneClass, glurpInitPos } from "/src/scenes/final/final-defs";
import { creditsFlow } from "/src/scenes/final/credits-flow";
import { kidraFlow } from "/src/scenes/final/kidra";
import { finalWomanFlow } from "/src/scenes/final/final-woman-flow";

const enterGlurp: Flow.PhaserNode = Flow.sequence(
  Flow.waitTimer(1000),
  Flow.lazy((scene) => {
    const glurpObj = creatureSceneClass.data.glurpObj.value(scene);
    finalSceneClass.data.attack.setValue({
      particles: scene.add.particles("fight", "light-particle").setDepth(1000),
    })(scene);
    return Flow.moveTo({
      target: glurpObj,
      dest: new Vector2(620, gameHeight / 2),
      speed: 200,
    });
  }),
);

export const finalIntro: Flow.PhaserNode = Flow.sequence(
  Flow.wait(globalEvents.subSceneEntered.subject),
  Flow.parallel(
    Flow.whenValueDo({
      condition: finalSceneClass.events.enterKidra.subject,
      action: () => kidraFlow,
    }),
    createGlurp({ pos: glurpInitPos, rotation: Math.PI / 2 }),
    finalWomanFlow,
    enterGlurp,
    Flow.whenValueDo({
      condition: finalSceneClass.events.runCredits.subject,
      action: () => creditsFlow,
    }),
  ),
);
