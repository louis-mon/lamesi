import * as Phaser from "phaser";
import { HubScene } from "./scenes/hub/hub";
import { gameWidth, gameHeight } from "./scenes/common";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: gameWidth,
  height: gameHeight,
  scale: {
    mode: Phaser.Scale.FIT,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
  scene: new HubScene(),
};

new Phaser.Game(config);
