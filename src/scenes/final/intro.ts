import * as Flow from "/src/helpers/phaser-flow";
import { globalEvents } from "/src/scenes/common/global-events";
import { creatureSceneClass } from "/src/scenes/creatures/def";
import Vector2 = Phaser.Math.Vector2;
import { gameHeight } from "/src/scenes/common/constants";

export const intro: Flow.PhaserNode = Flow.sequence(
  Flow.wait(globalEvents.subSceneEntered.subject),
  Flow.lazy((scene) => {
    const glurpObj = creatureSceneClass.data.glurpObj.value(scene);
    return Flow.moveTo({
      target: glurpObj,
      dest: new Vector2(620, gameHeight / 2),
      speed: 200,
    });
  }),
);
