import * as Phaser from "phaser";
import { MenuScene } from "../common/menu";
import * as Flow from "/src/helpers/phaser-flow";
import { subSceneFlow } from "/src/scenes/hub/sub-scenes";

export class HubScene extends Phaser.Scene {
  constructor() {
    super({
      key: "hub",
    });
  }

  create() {
    Flow.run(this, Flow.parallel(subSceneFlow));
    this.scene.add("menu", new MenuScene(), true, {
      currentScene: this,
    });
  }
}
