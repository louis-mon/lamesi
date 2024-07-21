import * as Flow from "/src/helpers/phaser-flow";
import { LightScene } from "/src/scenes/lights/lights";
import Phaser from "phaser";
import { DungeonScene } from "/src/scenes/dungeon/dungeon";
import { CreaturesScene } from "/src/scenes/creatures/creatures";
import { globalData, GlobalDataKey } from "../common/global-data";
import {
  creaturesSceneKey,
  dungeonSceneKey,
  finalSceneKey,
  gameHeight,
  gameRatio,
  gameWidth,
  lightsSceneKey,
  masterSceneKey,
  menuSceneKey,
} from "/src/scenes/common/constants";
import { MenuScene } from "/src/scenes/menu/menu-scene";
import { observe } from "/src/helpers/phaser-flow";
import { combineLatest, fromEvent } from "rxjs";
import { observeCommonGoEvent } from "/src/helpers/component";
import {
  getEventsOfScene,
  isEventReady,
  isEventSolved,
  solveEvent,
} from "/src/scenes/common/events-def";
import { fadeDuration } from "/src/scenes/menu/menu-scene-def";
import FADE_IN_COMPLETE = Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE;
import { keys } from "lodash";
import Vector2 = Phaser.Math.Vector2;
import { globalEvents } from "/src/scenes/common/global-events";
import { FinalScene } from "/src/scenes/final/final";
import { map } from "rxjs/operators";
import { hubSceneClass } from "/src/scenes/hub/hub-def";

const waitForCameraFadeIn: Flow.PhaserNode = Flow.lazy((scene) => {
  return Flow.waitTrue(hubSceneClass.data.masterReady.dataSubject);
});

type SubScene = {
  create: () => Phaser.Scene;
  key: string;
  position?: Vector2;
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
  {
    create: () => new FinalScene(),
    key: finalSceneKey,
    position: new Vector2(gameWidth / 2, 870),
  },
];

export const isASubScene = (key: string) =>
  subScenes.some((s) => s.key === key);

export const centerOfSubScene = (key: string) => {
  const sceneDef = subScenes.find((s) => s.key === key)!;
  if (sceneDef.position) return sceneDef.position;
  const i = subScenes.indexOf(sceneDef);
  const baseAngle = Math.PI / 10;
  const basePoint = new Vector2(gameWidth / 2, 2200);
  const nbPositioned = subScenes.filter((s) => !s.position).length;
  return basePoint
    .clone()
    .add(
      new Vector2(0, 0).setToPolar(
        (i - Math.floor(nbPositioned / 2)) * baseAngle - Math.PI / 2,
        1860,
      ),
    );
};

export const createSubSceneFlow = (sceneDef: SubScene): Flow.PhaserNode =>
  Flow.lazy((hubScene) => {
    const eventsOfScene = getEventsOfScene(sceneDef.key);
    const eventKeys = keys(eventsOfScene) as GlobalDataKey[];
    const firstTime = eventKeys.every((key) => !isEventSolved(key)(hubScene));
    const scene = hubScene.scene.add(sceneDef.key, sceneDef.create, false);
    scene.scene.moveBelow(sceneDef.key, menuSceneKey);
    hubScene.scene.launch(sceneDef.key);

    return observe(fromEvent(scene.events, "ready"), () => {
      const width = 447;
      const height = width * gameRatio;
      const { x, y } = centerOfSubScene(sceneDef.key)
        .clone()
        .subtract(new Phaser.Math.Vector2(width, height).scale(0.5));
      const mainCam = scene.cameras.main;
      mainCam.setViewport(x, y, width, height);
      mainCam.zoom = width / gameWidth;
      mainCam.centerOn(gameWidth / 2, gameHeight / 2);
      mainCam.inputEnabled = false;
      const createFrameObj = () => {
        const res = hubScene.add.image(x + width / 2, y + height / 2, "frame");
        res.setScale((width + 16) / res.width);
        return res;
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
                inSubScene: true,
              });
              hubScene.scene.remove();
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
                  props: { scale: newFrame.scale * 1.3, alpha: 0 },
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
        waitForCameraFadeIn,
        firstTime ? showScene() : Flow.noop,
        Flow.parallel(blinkScene, clickScene),
      );
    });
  });

export const subSceneFlow: Flow.PhaserNode = Flow.lazy((hubScene) => {
  if (
    isEventReady("dungeonDone")(hubScene) &&
    isEventReady("lightsDone")(hubScene)
  ) {
    solveEvent("dungeonDone")(hubScene);
  }
  const mainCam = hubScene.scene.get(masterSceneKey).cameras.main;
  hubSceneClass.data.masterReady.setValue(false)(hubScene);
  return Flow.parallel(
    Flow.sequence(
      Flow.wait(fromEvent(mainCam, FADE_IN_COMPLETE)),
      Flow.call(hubSceneClass.data.masterReady.setValue(true)),
    ),
    ...subScenes.map((sceneDef, i) => {
      const eventsOfScene = getEventsOfScene(sceneDef.key);
      const eventKeys = keys(eventsOfScene) as GlobalDataKey[];
      const hasAccess$ = combineLatest(
        eventKeys.map((key) => globalData[key].dataSubject(hubScene)),
      ).pipe(map((values) => values.some((x) => x)));

      return Flow.whenTrueDo({
        condition: hasAccess$,
        action: createSubSceneFlow(sceneDef),
      });
    }),
  );
});
