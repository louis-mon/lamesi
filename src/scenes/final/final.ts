import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { background } from "/src/scenes/final/background";
import { finalSceneKey } from "/src/scenes/common/constants";
import { creature } from "/src/scenes/final/creature";

export class FinalScene extends Phaser.Scene {
  constructor() {
    super({
      key: finalSceneKey,
      loader: {
        path: "assets/final",
      },
    });
  }

  preload() {
    this.load.image({
      key: "tombstones",
      extension: "jpg",
    });
  }

  create() {
    Flow.runScene(this, Flow.parallel(background, creature));
  }
}
