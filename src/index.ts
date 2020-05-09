import * as Phaser from "phaser";
import { LightScene } from "./scenes/lights/lights";
import { HubScene, gameWidth, gameHeight } from "./scenes/hub/hub";
import { DungeonScene } from "./scenes/dungeon/dungeon";

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
  scene: [new HubScene(), new LightScene(), new DungeonScene()],
};

new Phaser.Game(config);
