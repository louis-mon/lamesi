import { customEvent, defineSceneClass } from "/src/helpers/component";
import Phaser from "phaser";
import { ManipulableObject } from "/src/helpers/phaser";
import { MenuScene } from "/src/scenes/common/menu";

export const menuSceneDef = defineSceneClass({
  events: {
    goToHub: customEvent(),
  },
  data: {},
});

export const menuZoneSize = 75;

const getMenuScene = (scene: Phaser.Scene) =>
  scene.scene.get("menu") as MenuScene;

export const menuHelpers = {
  ensureOutsideMenu: (go: ManipulableObject) => {
    const diff = go.getLeftCenter().x - menuZoneSize;
    if (diff < 0) go.x -= diff;
  },
  getMenuScene,
};
