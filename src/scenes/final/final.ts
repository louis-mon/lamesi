import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { background } from "/src/scenes/final/background";
import { finalSceneKey } from "/src/scenes/common/constants";
import { finalIntro } from "/src/scenes/final/final-intro";
import { finalSceneClass } from "/src/scenes/final/final-defs";

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
      extension: "png",
    });
    this.load.image("kidra-arm1");
    this.load.image("kidra-arm2");
    this.load.image("kidra-body");
    this.load.image("kidra-head");
    this.load.image("kidra-left-leg");
    this.load.image("kidra-left-leg2");
    this.load.image("kidra-right-leg");
    this.load.image("kidra-right-leg2");
    this.load.image("kidra-weapon");
    this.load.atlas("fight");
    this.load.aseprite("kidra-minion");
    this.load.audio("final-fight", ["final-fight.mp3"]);
  }

  create() {
    this.anims.createFromAseprite("kidra-minion");
    finalSceneClass.data.lightBalls.setValue(this.physics.add.group())(this);
    finalSceneClass.data.glurpTargets.setValue([])(this);
    Flow.runScene(this, Flow.parallel(background, finalIntro));
  }
}
