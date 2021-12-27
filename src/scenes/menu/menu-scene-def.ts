import Phaser from "phaser";
import { ManipulableObject } from "/src/helpers/phaser";
import { MenuScene } from "/src/scenes/menu/menu-scene";
import { menuSceneKey } from "/src/scenes/common/constants";

export const menuZoneSize = 75;

export const fadeDuration = 700;

const getMenuScene = (scene: Phaser.Scene) =>
  scene.scene.get(menuSceneKey) as MenuScene;

export const menuHelpers = {
  ensureOutsideMenu: (go: ManipulableObject) => {
    const diff = go.getLeftCenter().x - menuZoneSize;
    if (diff < 0) go.x -= diff;
  },
  getMenuScene,
};
