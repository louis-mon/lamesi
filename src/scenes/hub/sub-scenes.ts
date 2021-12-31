import * as Flow from "/src/helpers/phaser-flow";
import { LightScene } from "/src/scenes/lights/lights";
import Phaser from "phaser";
import { DungeonScene } from "/src/scenes/dungeon/dungeon";
import { CreaturesScene } from "/src/scenes/creatures/creatures";
import { globalData, GlobalDataKey } from "../common/global-data";
import {
  creaturesSceneKey,
  dungeonSceneKey,
  gameHeight,
  gameRatio,
  gameWidth,
  lightsSceneKey,
  menuSceneKey,
} from "/src/scenes/common/constants";
import { MenuScene } from "/src/scenes/menu/menu-scene";
import { observe } from "/src/helpers/phaser-flow";
import { fromEvent } from "rxjs";
import { observeCommonGoEvent } from "/src/helpers/component";
import { getEventsOfScene, isEventSolved } from "/src/scenes/common/events-def";
import { fadeDuration, menuHelpers } from "/src/scenes/menu/menu-scene-def";
import FADE_IN_COMPLETE = Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE;
import { keys } from "lodash";

const waitForMenuFadeIn: Flow.PhaserNode = Flow.lazy((scene) =>
  Flow.wait(
    fromEvent(menuHelpers.getMenuScene(scene).cameras.main, FADE_IN_COMPLETE),
  ),
);

type SubScene = {
  create: () => Phaser.Scene;
  key: string;
};

const subScenes: SubScene[] = [
  {
    create: () => new LightScene(),
    key: lightsSceneKey,
  },
  {
    create: () => new DungeonScene(),
    key: dungeonSceneKey,
  },
  {
    create: () => new CreaturesScene(),
    key: creaturesSceneKey,
  },
];

export const subSceneFlow: Flow.PhaserNode = Flow.lazy((hubScene) =>
  Flow.parallel(
    ...subScenes.map((sceneDef, i) => {
      const eventsOfScene = getEventsOfScene(sceneDef.key);
      const eventKeys = keys(eventsOfScene) as GlobalDataKey[];
      const hasAccess = eventKeys.some((key) =>
        globalData[key].value(hubScene),
      );
      if (!hasAccess) {
        return Flow.noop;
      }
      const firstTime = eventKeys.every((key) => !isEventSolved(key)(hubScene));
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
        mainCam.setViewport(x, y, width, height);
        mainCam.zoom = width / gameWidth;
        mainCam.centerOn(gameWidth / 2, gameHeight / 2);
        mainCam.inputEnabled = false;
        const rect = hubScene.add
          .rectangle(x, y, width, height)
          .setOrigin(0, 0);
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
            hubScene.scene.remove(menuSceneKey);

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
                hubScene.scene.add(menuSceneKey, MenuScene, true, {
                  currentScene: scene,
                  parentScene: hubScene,
                });
                hubScene.scene.setActive(false);
              }),
            );
          },
        );
        const showScene = (): Flow.PhaserNode => {
          mainCam.fadeOut(0);
          return Flow.lazy(() => {
            mainCam.fadeIn(fadeDuration);
            return Flow.wait(fromEvent(mainCam, FADE_IN_COMPLETE));
          });
        };
        return Flow.sequence(
          waitForMenuFadeIn,
          firstTime ? showScene() : Flow.noop,
          clickScene,
        );
      });
    }),
  ),
);
