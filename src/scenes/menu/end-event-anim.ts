import * as Flow from "/src/helpers/phaser-flow";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import { getEventDef, solveEvent } from "/src/scenes/common/events-def";
import { EndEventAnim, globalEvents } from "/src/scenes/common/global-events";
import { fadeDuration } from "/src/scenes/menu/menu-scene-def";
import Vector2 = Phaser.Math.Vector2;

export const endEventAnim: (e: EndEventAnim) => Flow.PhaserNode = ({
  dataSolved,
}) =>
  Flow.lazy((scene) => {
    const fromScene = scene.scene.get(getEventDef(dataSolved).scene);
    const keyItem = getEventDef(dataSolved)
      .createItem({
        pos: new Vector2(gameWidth / 2, gameHeight / 2),
        scene,
      })
      .setAlpha(0)
      .setScale(1.7);
    fromScene.cameras.main.fade(fadeDuration);
    return Flow.sequence(
      Flow.call(solveEvent(dataSolved)),
      Flow.tween({
        targets: keyItem,
        props: { alpha: 1 },
        duration: 800,
      }),
      Flow.tween({
        targets: keyItem,
        delay: 600,
        props: { y: -keyItem.displayHeight },
        duration: 2600,
      }),
      Flow.waitTimer(600),
      Flow.call(globalEvents.goToHub.emit({})),
    );
  });
