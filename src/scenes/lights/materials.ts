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
import { getObjectPosition, ManipulableObject } from "/src/helpers/phaser";
import Phaser from "phaser";
import { isEventReady, isEventSolved } from "/src/scenes/common/events-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { compact } from "lodash";
import TweenBuilderConfig = Phaser.Types.Tweens.TweenBuilderConfig;
import { zoomTrackFlow } from "/src/scenes/lights/zoom-tracks";
import { declareGoInstance } from "/src/helpers/component";
import * as _ from "lodash";
import Vector3 = Phaser.Math.Vector3;
import Vector2 = Phaser.Math.Vector2;

function pt2dto3d(v: Vector2) {
  return new Vector3(v.x, v.y, 0);
}

const createGem = (scene: Phaser.Scene, matDef: LightSceneMaterialDef) => {
  const go = matDef.create(scene);
  const albedo = Phaser.Display.Color.IntegerToColor(go.fillColor);
  const intensity = 2;
  const graphics = scene.add
    .graphics({
      x: go.x,
      y: go.y,
    })
    .setDepth(materialsPlane);
  const points = matDef.getPoints();
  const rect = Phaser.Geom.Point.GetRectangleFromPoints(points);
  points.forEach((p) => {
    p.x -= rect.centerX;
    p.y -= rect.centerY;
  });
  const centroid2d = getObjectPosition(Phaser.Geom.Point.GetCentroid(points));
  const centroid = new Vector3(centroid2d.x, centroid2d.y, 20);
  Flow.runScene(
    scene,
    Flow.handlePostUpdate({
      handler: () => () => {
        graphics.clear();
        graphics.lineStyle(1, 0);
        const pointLights = _.flatMap(sceneDef.lights, (lightDef) => {
          const l = scene.children.getByName(lightDef.key) as ManipulableObject;
          if (!l) {
            return [];
          }
          return [
            new Vector3(l.x, l.y, 200)
              .subtract(centroid.clone().add(pt2dto3d(getObjectPosition(go))))
              .normalize(),
          ];
        });

        function computeColor(n: Vector3) {
          const finalColor = new Vector3(0, 0, 0);
          pointLights.forEach((toLight) => {
            const f = n.dot(toLight);
            finalColor.x += f * albedo.red * intensity;
            finalColor.y += f * albedo.green * intensity;
            finalColor.z += f * albedo.blue * intensity;
          });
          return Phaser.Display.Color.GetColor(
            Phaser.Math.Clamp(finalColor.x, 0, 255),
            Phaser.Math.Clamp(finalColor.y, 0, 255),
            Phaser.Math.Clamp(finalColor.z, 0, 255),
          );
        }

        go.fillColor = computeColor(new Vector3(0, 0, 1));

        _.range(points.length).forEach((i) => {
          const currentPoint = getObjectPosition(points[i]);
          const scaleInt = 0.6;
          const currentPointPrec = centroid
            .clone()
            .lerp(pt2dto3d(currentPoint), scaleInt);
          const nextPoint = getObjectPosition(points[(i + 1) % points.length]);
          const nextPointPrec = centroid
            .clone()
            .lerp(pt2dto3d(nextPoint), scaleInt);
          const normal = currentPointPrec
            .clone()
            .subtract(nextPointPrec)
            .cross(pt2dto3d(nextPoint).clone().subtract(nextPointPrec))
            .normalize();
          graphics.fillStyle(computeColor(normal));
          graphics.beginPath();
          graphics.moveTo(currentPoint.x, currentPoint.y);
          graphics.lineTo(currentPointPrec.x, currentPointPrec.y);
          graphics.lineTo(nextPointPrec.x, nextPointPrec.y);
          graphics.lineTo(nextPoint.x, nextPoint.y);
          if (matDef.getContourPoints) {
            graphics.arc(
              0,
              0,
              currentPoint.length(),
              nextPoint.angle(),
              currentPoint.angle(),
              true,
            );
          }
          graphics.closePath();
          graphics.strokePath();
          graphics.fill();
        });
        graphics.setScale(go.scale);
        graphics.setPosition(go.x, go.y);
        graphics.setAlpha(go.alpha);
      },
    }),
  );
  return go;
};

export const createMaterial = (
  matDef: LightSceneMaterialDef,
): Flow.PhaserNode =>
  Flow.lazy((s) => {
    const eventRequired = matDef.eventRequired;
    if (!isEventReady(eventRequired)(s)) return Flow.noop;
    const scene = s as LightScene;
    const go = createGem(scene, matDef)
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

    return Flow.parallel(
      zoomTrackFlow(matDef),
      Flow.sequence(
        isEventSolved(eventRequired)(scene) ? Flow.noop : appearCinematic(),
        showMaterial,
      ),
    );
  });
