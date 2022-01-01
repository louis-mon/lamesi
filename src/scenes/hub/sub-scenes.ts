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
import Vector2 = Phaser.Math.Vector2;
import { globalEvents } from "/src/scenes/common/global-events";

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

export const isASubScene = (key: string) =>
  subScenes.some((s) => s.key === key);

export const centerOfSubScene = (key: string) => {
  const i = subScenes.findIndex((s) => s.key === key);
  const baseAngle = Math.PI / 10;
  const basePoint = new Vector2(gameWidth / 2, 2200);
  return basePoint
    .clone()
    .add(
      new Vector2(0, 0).setToPolar(
        (i - Math.floor(subScenes.length / 2)) * baseAngle - Math.PI / 2,
        1860,
      ),
    );
};

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

      return observe(fromEvent(scene.events, "ready"), () => {
        const width = 447;
        const height = width * gameRatio;
        const { x, y } = centerOfSubScene(sceneDef.key).subtract(
          new Phaser.Math.Vector2(width, height).scale(0.5),
        );
        const mainCam = scene.cameras.main;
        mainCam.setViewport(x, y, width, height);
        mainCam.zoom = width / gameWidth;
        mainCam.centerOn(gameWidth / 2, gameHeight / 2);
        mainCam.inputEnabled = false;
        const createFrameObj = () => {
          return hubScene.add.image(x + width / 2, y + height / 2, "frame");
        };
        const frameObj = createFrameObj();
        frameObj.setInteractive();
        const clickScene = observe(
          observeCommonGoEvent(frameObj, "pointerdown"),
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

        const blinkScene: Flow.PhaserNode = Flow.observe(
          globalEvents.subSceneHint.subject,
          ({ sceneKey }) => {
            if (sceneKey !== sceneDef.key) return Flow.noop;

            const genFrameAnim: Flow.PhaserNode = Flow.lazy(() => {
              const newFrame = createFrameObj();
              return Flow.parallel(
                Flow.sequence(
                  Flow.tween({
                    targets: newFrame,
                    props: { scale: 1.5, alpha: 0 },
                    duration: 1200,
                  }),
                  Flow.call(() => newFrame.destroy()),
                ),
                Flow.sequence(Flow.waitTimer(500), genFrameAnim),
              );
            });
            return genFrameAnim;
          },
        );

        return Flow.sequence(
          waitForMenuFadeIn,
          firstTime ? showScene() : Flow.noop,
          Flow.parallel(blinkScene, clickScene),
        );
      });
    }),
  ),
);
