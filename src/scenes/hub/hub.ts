import * as Phaser from "phaser";
import { eventsHelpers } from "../global-events";

export const gameWidth = 800;
export const gameHeight = 600;
export const gameRatio = gameHeight / gameWidth;

export class HubScene extends Phaser.Scene {
  constructor() {
    super({
      key: "hub"
    });
  }

  create() {
    eventsHelpers.startupEvents.forEach(ev => this.registry.toggle(ev));
    const scenes = [
      {
        key: "lights",
        position: new Phaser.Math.Vector2(100, 100)
      },
      {
        key: "fake",
        position: new Phaser.Math.Vector2(400, 100)
      }
    ];
    scenes.forEach(sceneDef => {
      const scene = this.scene.get(sceneDef.key);
      this.scene.launch(sceneDef.key);
      const width = 250;
      const { x, y } = sceneDef.position;
      const height = width * gameRatio;
      const mainCam = scene.cameras.main;
      mainCam.setViewport(x, y, width, height);
      const rect = this.add.rectangle(x, y, width, height).setOrigin(0, 0);
      rect.setStrokeStyle(3, 0xff0000);
      rect.setInteractive();
      rect.on("pointerdown", () => {
        this.tweens.add({
          targets: mainCam,
          props: {
            width: gameWidth,
            height: gameHeight,
            x: 0,
            y: 0,
            zoom: 1,
            scrollX: 0,
            scrollY: 0
          }
        });
        scenes.forEach(otherScene => {
          if (otherScene === sceneDef) return;
          this.scene.stop(otherScene.key);
        });
        this.scene.setVisible(false);
        mainCam.inputEnabled = true;
      });
      mainCam.zoom = width / gameWidth;
      mainCam.centerOn(gameWidth / 2, gameHeight / 2);
      mainCam.inputEnabled = false;
    });
  }
}
