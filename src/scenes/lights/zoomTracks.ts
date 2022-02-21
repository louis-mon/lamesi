import * as Flow from "/src/helpers/phaser-flow";
import {
  curtainsPlane,
  LightSceneMaterialDef,
  materialClass,
  materialsPlane,
  sceneClass,
  sceneDef,
  shadowPlane,
} from "/src/scenes/lights/lights-def";
import { isEventReady, isEventSolved } from "/src/scenes/common/events-def";
import Phaser from "phaser";
import { min } from "lodash";
import { gameHeight } from "/src/scenes/common/constants";
import { map } from "rxjs/operators";

export const presentZoomTrack: Flow.PhaserNode = Flow.lazy((scene) => {
  const rectWidth =
    min(
      sceneDef.materials.map(
        (mat) => mat.zoom?.pos.x ?? Number.MAX_SAFE_INTEGER,
      ),
    ) ?? 0 - 100;
  const blackRect = scene.add
    .rectangle(0, 0, rectWidth, gameHeight, 0)
    .setDepth(curtainsPlane)
    .setAlpha(0)
    .setOrigin(0, 0);
  return Flow.sequence(
    Flow.tween({ targets: blackRect, duration: 2000, props: { alpha: 0.86 } }),
    Flow.waitTimer(2500),
    Flow.call(sceneClass.events.showZoomTracks.emit({})),
    Flow.waitTrue(
      sceneClass.data.hiddenZoomTracks.subject(scene).pipe(map((v) => v === 0)),
    ),
    Flow.tween({ targets: blackRect, duration: 2000, props: { alpha: 0 } }),
    Flow.call(() => blackRect.destroy()),
  );
});

export const zoomTrackFlow = (matDef: LightSceneMaterialDef): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const zoomDef = matDef.zoom;
    if (!zoomDef || !isEventReady(zoomDef.eventRequired)(scene)) {
      return Flow.noop;
    }
    const startHidden =
      !isEventSolved(zoomDef.eventRequired)(scene) &&
      zoomDef.eventRequired === "lights3";
    const track = scene.add
      .image(zoomDef.pos.x, zoomDef.pos.y, "materials", "zoom-track")
      .setOrigin(0.5, 0)
      .setAlpha(startHidden ? 0 : 1)
      .setDepth(shadowPlane);
    const yposMin = track.getTopRight().y;
    const yAmpl = track.displayHeight;
    const dMin = zoomDef.minDepth;
    const dAmpl = zoomDef.maxDepth - dMin;
    const depth = materialClass.data.depth(matDef.key);

    const matIcon = matDef
      .create(scene)
      .setAlpha(startHidden ? 0 : 1)
      .setInteractive()
      .setDepth(materialsPlane)
      .setPosition(
        zoomDef.pos.x,
        Phaser.Math.Linear(
          yposMin,
          yposMin + yAmpl,
          1 - (depth.value(scene) - dMin) / dAmpl,
        ),
      );
    matIcon.scale = 25 / matIcon.width;
    scene.input.setDraggable(matIcon);

    matIcon.on("drag", (pointer, x, y) => {
      matIcon.y = Phaser.Math.Clamp(y, yposMin, yposMin + yAmpl);
      depth.setValue(
        Phaser.Math.Linear(
          dMin,
          dMin + dAmpl,
          1 - (matIcon.y - yposMin) / yAmpl,
        ),
      )(scene);
      materialClass.getObj(matDef.key)(scene).scale = 1 / depth.value(scene);
    });
    sceneClass.data.hiddenZoomTracks.updateValue((v) => v + 1)(scene);
    return Flow.sequence(
      Flow.wait(sceneClass.events.showZoomTracks.subject),
      Flow.tween({ targets: track, props: { alpha: 1 }, duration: 2000 }),
      Flow.tween({ targets: matIcon, props: { alpha: 1 }, duration: 2000 }),
      Flow.call(sceneClass.data.hiddenZoomTracks.updateValue((v) => v - 1)),
    );
  });
