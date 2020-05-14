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
        position: new Phaser.Math.Vector2(100, 100),
      },
      {
        create: () => new DungeonScene(),
        key: "dungeon",
        position: new Phaser.Math.Vector2(400, 100),
      },
    ];
    scenes.forEach((sceneDef) => {
      const scene = this.scene.add(sceneDef.key, sceneDef.create, false);
      this.scene.launch(sceneDef.key);
      scene.events.on("ready", () => {
        const width = 250;
        const { x, y } = sceneDef.position;
        const height = width * gameRatio;
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
              this.scene.add("menu", new MenuScene(), true, {
                currentScene: scene.scene.key,
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
      currentScene: this.scene.key,
    });
  }
}
