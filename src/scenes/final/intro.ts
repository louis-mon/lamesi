import * as Flow from "/src/helpers/phaser-flow";
import { globalEvents } from "/src/scenes/common/global-events";
import { creatureSceneClass } from "/src/scenes/creatures/def";
import Vector2 = Phaser.Math.Vector2;
import { gameHeight } from "/src/scenes/common/constants";
import { createSpriteAt } from "/src/helpers/phaser";
import { createGlurp } from "/src/scenes/creatures/glurp";
import { glurpInitPos } from "/src/scenes/final/defs";

const createWoman: Flow.PhaserNode = Flow.lazy((scene: Phaser.Scene) => {
  scene.anims.createFromAseprite("dungeon-player");
  const playerY = 720;
  const player = createSpriteAt(
    scene,
    new Vector2(-20, playerY),
    "dungeon-player",
  );
  player.setScale(2);

  player.anims.play({ key: "walk", repeat: -1 });
  return Flow.sequence(
    Flow.moveTo({
      target: player,
      dest: new Vector2(990, playerY),
      speed: 200,
    }),
    Flow.call(() => {
      player.anims.stop();
      player.play("idle");
    }),
  );
});

export const intro: Flow.PhaserNode = Flow.sequence(
  Flow.wait(globalEvents.subSceneEntered.subject),
  Flow.parallel(
    createGlurp({ pos: glurpInitPos, rotation: Math.PI / 2 }),
    createWoman,
    Flow.sequence(
      Flow.waitTimer(1000),
      Flow.lazy((scene) => {
        const glurpObj = creatureSceneClass.data.glurpObj.value(scene);
        return Flow.moveTo({
          target: glurpObj,
          dest: new Vector2(620, gameHeight / 2),
          speed: 200,
        });
      }),
    ),
  ),
);
