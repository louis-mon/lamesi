import * as Phaser from "phaser";
import { HubScene } from "./scenes/hub/hub";
import { gameWidth, gameHeight } from "./scenes/common/constants";
import _ from "lodash";
import { eventsHelpers } from "/src/scenes/common/global-data";

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
    preBoot: (game) => {
      const storageKey = "save";
      const oldSave = localStorage.getItem(storageKey);
      const initialData = oldSave
        ? JSON.parse(oldSave)
        : eventsHelpers.startupEvents;
      _.mapValues(initialData, (value, key) => game.registry.set(key, value));
      game.events.on("changedata", (parent: unknown) => {
        if (parent !== game) return;
        localStorage.setItem(
          storageKey,
          JSON.stringify(game.registry.getAll()),
        );
      });
    },
  },
};

new Phaser.Game(config);
