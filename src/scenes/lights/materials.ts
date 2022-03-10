import * as Flow from "/src/helpers/phaser-flow";
import {
  LightSceneMaterialDef,
  materialClass,
  materialsPlane,
  sceneDef,
  shadowName,
  shadowPlane,
} from "/src/scenes/lights/lights-def";
import { LightScene } from "/src/scenes/lights/lights";
import { debugObjectPos } from "/src/helpers/debug/debug-object-pos";
import { ManipulableObject } from "/src/helpers/phaser";
import Phaser from "phaser";
import { isEventReady, isEventSolved } from "/src/scenes/common/events-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { compact } from "lodash";
import TweenBuilderConfig = Phaser.Types.Tweens.TweenBuilderConfig;
import { zoomTrackFlow } from "/src/scenes/lights/zoom-tracks";
import { declareGoInstance } from "/src/helpers/component";

export const createMaterial = (
  matDef: LightSceneMaterialDef,
): Flow.PhaserNode =>
  Flow.lazy((s) => {
    const eventRequired = matDef.eventRequired;
    if (!isEventReady(eventRequired)(s)) return Flow.noop;
    const scene = s as LightScene;
    const go = matDef
      .create(scene)
      .setScale(1 / matDef.depth)
      .setAlpha(0)
      .setDepth(materialsPlane);
    scene.setCommonProps(go, matDef);
    const goInst = declareGoInstance(materialClass, matDef.key);
    goInst.create(go as any);
    goInst.data.depth.setValue(matDef.depth)(scene);

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

    return Flow.sequence(
      isEventSolved(eventRequired)(scene) ? Flow.noop : appearCinematic(),
      showMaterial,
      zoomTrackFlow(matDef),
    );
  });
