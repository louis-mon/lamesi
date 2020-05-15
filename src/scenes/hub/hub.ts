import * as Phaser from "phaser";
import { gameRatio, gameWidth, gameHeight } from "../common";
import { eventsHelpers } from "../global-events";
import { LightScene } from "../lights/lights";
import { DungeonScene } from "../dungeon/dungeon";
import { MenuScene } from "../menu";

export class HubScene extends Phaser.Scene {
  constructor() {
    super({
      key: "hub",
    });
  }

  create() {
    eventsHelpers.startupEvents.forEach((ev) => this.registry.set(ev, true));
    const scenes = [
      {
        create: () => new LightScene(),
        key: "lights",
        position: new Phaser.Math.Vector2(300, 200),
      },
      {
        create: () => new DungeonScene(),
        key: "dungeon",
        position: new Phaser.Math.Vector2(1200, 200),
      },
    ];
    scenes.forEach((sceneDef, i) => {
      const scene = this.scene.add(sceneDef.key, sceneDef.create, false);
      this.scene.launch(sceneDef.key);
      const bigRect = new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight);
      scene.events.on("ready", () => {
        const width = 700;
        const height = width * gameRatio;
        const { x, y } = new Phaser.Math.Vector2(
          Phaser.Geom.Point.GetCentroid([
            bigRect.getPoint(i / scenes.length),
            new Phaser.Math.Vector2(gameWidth / 2, gameHeight / 2),
          ]),
        ).subtract(new Phaser.Math.Vector2(width, height).scale(0.5));
        const mainCam = scene.cameras.main;
        mainCam.setViewport(x, y, width, height);
        mainCam.zoom = width / gameWidth;
        mainCam.centerOn(gameWidth / 2, gameHeight / 2);
        mainCam.inputEnabled = false;
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
              scrollY: 0,
            },
            duration: 500,
            onComplete: () => {
              mainCam.inputEnabled = true;
              this.scene.add("menu", MenuScene, true, {
                currentScene: scene,
                parentScene: this,
              });
            },
          });
          scenes.forEach((otherScene) => {
            if (otherScene === sceneDef) return;
            this.scene.remove(otherScene.key);
          });
          this.scene.setVisible(false);
          this.scene.remove("menu");
        });
      });
    });
    this.scene.add("menu", new MenuScene(), true, {
      currentScene: this,
    });
  }
}
