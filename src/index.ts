import * as Phaser from "phaser";
import { LightScene } from "./scenes/lights/lights";
import { HubScene, gameWidth, gameHeight } from "./scenes/hub/hub";
import { FakeScene } from "./scenes/fake-scene";

var config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: gameWidth,
  height: gameHeight,
  scale: {
    mode: Phaser.Scale.FIT,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 200 }
    }
  },
  scene: [new HubScene(), new LightScene(), new FakeScene()]
};

new Phaser.Game(config);
