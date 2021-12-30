import * as Flow from "/src/helpers/phaser-flow";

export const backgroundFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  scene.add.image(0, 0, "back").setOrigin(0, 0);
  return Flow.noop;
});
