import * as Flow from "/src/helpers/phaser-flow";
import { LightScene } from "/src/scenes/lights/lights";
import Phaser from "phaser";
import { DungeonScene } from "/src/scenes/dungeon/dungeon";
import { CreaturesScene } from "/src/scenes/creatures/creatures";
import { globalData, GlobalDataKey } from "../common/global-data";
import { gameHeight, gameRatio, gameWidth } from "/src/scenes/common/constants";
import { MenuScene } from "/src/scenes/menu";
import { observe } from "/src/helpers/phaser-flow";
import { fromEvent } from "rxjs";
import { observeCommonGoEvent } from "/src/helpers/component";
import Vector2 = Phaser.Math.Vector2;

type SubScene = {
  create: () => Phaser.Scene;
  key: string;
  trigger: GlobalDataKey;
  available: GlobalDataKey;
};

const subScenes: SubScene[] = [
  {
    create: () => new LightScene(),
    key: "lights",
    available: "lightsAvailable",
    trigger: "lights1",
  },
  {
    create: () => new DungeonScene(),
    key: "dungeon",
    trigger: "lights2",
    available: "dungeonAvailable",
  },
  {
    create: () => new CreaturesScene(),
    key: "creatures",
    available: "creaturesAvailable",
    trigger: "lights2",
  },
];

export const subSceneFlow: Flow.PhaserNode = Flow.lazy((hubScene) =>
  Flow.parallel(
    ...subScenes.map((sceneDef, i) => {
      const isTriggered = globalData[sceneDef.trigger].value(hubScene);
      const isAvailable = globalData[sceneDef.available].value(hubScene);
      const firstTime = !isAvailable && isTriggered;
      if (!isAvailable && !isTriggered) {
        return Flow.noop;
      }
      const scene = hubScene.scene.add(sceneDef.key, sceneDef.create, false);
      hubScene.scene.launch(sceneDef.key);
      const bigRect = new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight);

      return observe(fromEvent(scene.events, "ready"), () => {
        const width = 700;
        const height = width * gameRatio;
        const { x, y } = new Phaser.Math.Vector2(
          Phaser.Geom.Point.GetCentroid([
            bigRect.getPoint(i / subScenes.length),
            new Phaser.Math.Vector2(gameWidth / 2, gameHeight / 2),
          ]),
        ).subtract(new Phaser.Math.Vector2(width, height).scale(0.5));
        const mainCam = scene.cameras.main;
        mainCam.alpha = firstTime ? 0 : 1;
        mainCam.setViewport(x, y, width, height);
        mainCam.zoom = width / gameWidth;
        mainCam.centerOn(gameWidth / 2, gameHeight / 2);
        mainCam.inputEnabled = false;
        const rect = hubScene.add
          .rectangle(x, y, width, height)
          .setOrigin(0, 0)
          .setAlpha(firstTime ? 0 : 1);
        rect.setStrokeStyle(3, 0xff0000);
        rect.setInteractive();
        const clickScene = observe(
          observeCommonGoEvent(rect, "pointerdown"),
          () => {
            subScenes.forEach((otherScene) => {
              if (otherScene === sceneDef) return;
              hubScene.scene.remove(otherScene.key);
            });
            hubScene.scene.setVisible(false);
            hubScene.scene.remove("menu");

            return Flow.sequence(
              Flow.tween({
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
              }),
              Flow.call(() => {
                mainCam.inputEnabled = true;
                hubScene.scene.add("menu", MenuScene, true, {
                  currentScene: scene,
                  parentScene: hubScene,
                });
                hubScene.scene.setActive(false);
              }),
            );
          },
        );
        const showScene = Flow.sequence(
          Flow.tween({
            targets: [mainCam, rect],
            props: { alpha: 1 },
            duration: 2000,
          }),
          Flow.call(globalData[sceneDef.available].setValue(true)),
        );
        return Flow.sequence(firstTime ? showScene : Flow.noop, clickScene);
      });
    }),
  ),
);
