import * as Flow from "/src/helpers/phaser-flow";
import { globalEvents } from "/src/scenes/common/global-events";
import { creatureSceneClass } from "/src/scenes/creatures/def";
import Vector2 = Phaser.Math.Vector2;
import { gameHeight } from "/src/scenes/common/constants";
import { createSpriteAt } from "/src/helpers/phaser";
import { createGlurp } from "/src/scenes/creatures/glurp";
import { finalSceneClass, glurpInitPos } from "/src/scenes/final/final-defs";
import { creditsFlow } from "/src/scenes/final/credits-flow";
import { kidraFlow } from "/src/scenes/final/kidra";

const enterWoman: Flow.PhaserNode = Flow.lazy((scene: Phaser.Scene) => {
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
      dest: new Vector2(867, playerY),
      speed: 200,
    }),
    Flow.moveTo({
      target: player,
      dest: new Vector2(993, 600),
      speed: 200,
    }),
    Flow.call(() => {
      player.anims.stop();
      player.play("idle");
    }),
    Flow.waitTimer(1000),
    Flow.call(() => {
      player.play("kneel");
    }),
    Flow.waitTimer(4000),
    Flow.call(finalSceneClass.events.enterKidra.emit({})),
    Flow.waitTimer(3000),
    Flow.call(() => {
      player.play("idle");
    }),
  );
});

const enterGlurp: Flow.PhaserNode = Flow.sequence(
  Flow.waitTimer(1000),
  Flow.lazy((scene) => {
    const glurpObj = creatureSceneClass.data.glurpObj.value(scene);
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
    enterWoman,
    enterGlurp,
    Flow.sequence(
      Flow.waitTimer(2000),
      //creditsFlow,
    ),
  ),
);
