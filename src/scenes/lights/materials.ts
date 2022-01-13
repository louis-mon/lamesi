import * as Flow from "/src/helpers/phaser-flow";
import {
  LightSceneMaterialDef,
  materialsPlane,
  sceneDef,
  shadowName,
  shadowPlane,
} from "/src/scenes/lights/lights-def";
import { LightScene } from "/src/scenes/lights/lights";
import { debugObjectPos } from "/src/helpers/debug/debug-object-pos";
import { ManipulableObject } from "/src/helpers/phaser";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import Phaser from "phaser";
import { isEventReady, isEventSolved } from "/src/scenes/common/events-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { compact } from "lodash";
import TweenBuilderConfig = Phaser.Types.Tweens.TweenBuilderConfig;

export const createMaterial = (
  matDef: LightSceneMaterialDef,
  i: number,
): Flow.PhaserNode =>
  Flow.lazy((s) => {
    const eventRequired = matDef.eventRequired;
    if (!isEventReady(eventRequired)(s)) return Flow.noop;
    const scene = s as LightScene;
    let depth = matDef.depth;
    const go = matDef
      .create(scene)
      .setScale(1 / depth)
      .setAlpha(0)
      .setDepth(materialsPlane);
    scene.setCommonProps(go, matDef);

    const shadowTargetAlpha = 0.5;
    const shadows = compact(
      sceneDef.lights.map((lightDef) => {
        const lightObj = scene.children.getByName(lightDef.key);
        if (!lightObj) return null;
        const shadow = matDef.create(scene).setAlpha(0);
        debugObjectPos(scene, shadow);
        shadow.name = shadowName(matDef.key, lightDef);
        shadow.depth = shadowPlane;
        scene.shadows.push({
          source: lightObj as ManipulableObject,
          material: go,
          shadow,
          def: matDef,
        });
        return shadow;
      }),
    );

    const appearCinematic = () => {
      const tweenParams: Omit<TweenBuilderConfig, "targets"> = {
        duration: 2000,
        ease: Phaser.Math.Easing.Sine.Out,
      };
      return Flow.sequence(
        Flow.wait(globalEvents.subSceneEntered.subject),
        Flow.parallel(
          Flow.tween({
            targets: go,
            props: { alpha: 1 },
            ...tweenParams,
          }),
          ...shadows.map((shadow) =>
            Flow.tween({
              targets: shadow,
              props: { alpha: shadowTargetAlpha },
              ...tweenParams,
            }),
          ),
        ),
      );
    };
    const showMaterial = Flow.call(() => {
      go.alpha = 1;
      shadows.forEach((shadow) => shadow.setAlpha(shadowTargetAlpha));
    });
    if (matDef.rope && isEventReady(matDef.rope.eventRequired)(scene)) {
      const { minDepth, maxDepth } = matDef.rope;
      const ropeObj = scene.add.image(gameWidth - 30 * i - 20, 0, "rope");
      const ropeIcon = matDef.create(scene);
      ropeIcon.scale = 25 / ropeIcon.width;
      ropeObj.setOrigin(0.5, 1);
      ropeObj.setInteractive();
      scene.input.setDraggable(ropeObj);
      const yposMin = 50;
      const yAmpl = gameHeight - 50;
      scene.events.on("update", () => {
        go.scale = 1 / depth;
        ropeObj.y = Phaser.Math.Linear(yposMin, yposMin + yAmpl, 1 - depth);
        ropeIcon.setPosition(ropeObj.x, ropeObj.y + 30);
      });
      ropeObj.on("drag", (pointer, x, y) => {
        depth = Phaser.Math.Clamp(
          depth - (y - ropeObj.y) / yAmpl,
          minDepth,
          maxDepth,
        );
      });
    }

    return Flow.sequence(
      isEventSolved(eventRequired)(scene) ? Flow.noop : appearCinematic(),
      showMaterial,
    );
  });
