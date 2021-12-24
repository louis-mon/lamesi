import * as Phaser from "phaser";
import { HubScene } from "./scenes/hub/hub";
import { gameWidth, gameHeight } from "./scenes/common/constants";
import { gamePreBoot } from "/src/scenes/game/pre-boot";

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
  callbacks: {
    preBoot: gamePreBoot,
  },
};

new Phaser.Game(config);
