import * as Phaser from "phaser";
import { gameWidth, gameHeight } from "./scenes/common/constants";
import { gamePreBoot } from "/src/scenes/game/pre-boot";
import { MasterScene } from "/src/scenes/master/master-scene";

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
  scene: new MasterScene(),
  callbacks: {
    preBoot: gamePreBoot,
  },
};

new Phaser.Game(config);
