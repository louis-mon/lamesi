import * as Phaser from "phaser";
import { LightScene } from "./scenes/lights/lights";
import { HubScene } from "./scenes/hub/hub";

var config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 200 }
    }
  },
  scene: [new HubScene(), new LightScene()]
};

new Phaser.Game(config);
