import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";

export const background: Flow.PhaserNode = Flow.call((scene) => {
  scene.add.image(0, 0, "tombstones").setOrigin(0, 0);
});
