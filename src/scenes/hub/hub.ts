import * as Phaser from "phaser";
import { gameRatio, gameWidth, gameHeight } from "../common/constants";
import { eventsHelpers } from "../common/global-data";
import { LightScene } from "../lights/lights";
import { DungeonScene } from "../dungeon/dungeon";
import { MenuScene } from "../menu";
import _ from "lodash";
import { CreaturesScene } from "../creatures/creatures";
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
