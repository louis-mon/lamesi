import * as Flow from "/src/helpers/phaser-flow";
import { gameHeight, menuSceneKey } from "/src/scenes/common/constants";

export const cutscene = (flow: Flow.PhaserNode): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const menuScene = scene.scene.get(menuSceneKey);
    const hourglass = menuScene.add
      .image(50, gameHeight - 50, "items", "wait-cutscene")
      .setOrigin(0, 1)
      .setScale(2.5);
    scene.tweens.add({
      targets: hourglass,
      props: { alpha: 0.4 },
      repeat: -1,
      duration: 700,
      ease: Phaser.Math.Easing.Sine.In,
      yoyo: true,
    });
    return Flow.withCleanup({
      flow: Flow.sequence(
        Flow.call((scene) => (scene.input.enabled = false)),
        flow,
      ),
      cleanup: (scene) => {
        scene.input.enabled = true;
        hourglass.destroy();
      },
    });
  });
