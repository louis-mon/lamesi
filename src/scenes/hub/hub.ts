import * as Phaser from "phaser";
import { gameZoneHelpers } from "../common";
import { FakeScene } from "../fake-scene";
import { eventsHelpers } from "../global-events";
import { LightScene } from "../lights/lights";

export const gameWidth = 1920;
export const gameHeight = 1080;
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
        create: () => new LightScene(),
        key: "lights",
        position: new Phaser.Math.Vector2(100, 100)
      },
      {
        create: () => new FakeScene(),
        key: "fake",
        position: new Phaser.Math.Vector2(400, 100)
      }
    ];
    scenes.forEach(sceneDef => {
      const scene = this.scene.get(sceneDef.key);
      this.scene.launch(sceneDef.key);
      scene.events.on("ready", () => {
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
            },
            onComplete: () => {
              mainCam.inputEnabled = true;
              gameZoneHelpers.createZone(scene);
            }
          });
          scenes.forEach(otherScene => {
            if (otherScene === sceneDef) return;
            this.scene.stop(otherScene.key);
          });
          this.scene.setVisible(false);
        });
        mainCam.zoom = width / gameWidth;
        mainCam.centerOn(gameWidth / 2, gameHeight / 2);
        mainCam.inputEnabled = false;
      });
    });
  }
}
