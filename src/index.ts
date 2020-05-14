import * as Phaser from "phaser";
import { LightScene } from "./scenes/lights/lights";
import { HubScene } from "./scenes/hub/hub";
import { DungeonScene } from "./scenes/dungeon/dungeon";
import { gameWidth, gameHeight } from "./scenes/common";
import { MenuScene } from "./scenes/menu";

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
      gravity: { y: 200 },
    },
  },
  scene: new HubScene(),
};

new Phaser.Game(config);
