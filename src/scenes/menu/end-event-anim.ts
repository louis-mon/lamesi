import * as Flow from "/src/helpers/phaser-flow";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import { getEventDef, solveEvent } from "/src/scenes/common/events-def";
import { EndEventAnim, globalEvents } from "/src/scenes/common/global-events";
import { fadeDuration } from "/src/scenes/menu/menu-scene-def";

export const endEventAnim: (e: EndEventAnim) => Flow.PhaserNode = ({
  dataSolved,
  fromScene,
}) =>
  Flow.lazy((scene) => {
    const keyItem = scene.add
      .image(
        gameWidth / 2,
        gameHeight / 2,
        "items",
        getEventDef(dataSolved).keyItem,
      )
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
