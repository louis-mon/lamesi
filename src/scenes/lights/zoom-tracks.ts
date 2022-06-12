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
import { max, min, minBy } from "lodash";
import { gameHeight } from "/src/scenes/common/constants";
import { map } from "rxjs/operators";
import { cutscene } from "/src/scenes/common/cutscene";

export const presentZoomTrack: Flow.PhaserNode = Flow.lazy((scene) => {
  if (sceneClass.data.hiddenZoomTracks.value(scene) === 0) return Flow.noop;
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
  return cutscene(
    Flow.sequence(
      Flow.tween({
        targets: blackRect,
        duration: 2000,
        props: { alpha: 0.86 },
      }),
      Flow.waitTimer(2500),
      Flow.call(sceneClass.events.showZoomTracks.emit({})),
      Flow.waitTrue(
        sceneClass.data.hiddenZoomTracks
          .subject(scene)
          .pipe(map((v) => v === 0)),
      ),
      Flow.tween({ targets: blackRect, duration: 2000, props: { alpha: 0 } }),
      Flow.call(() => blackRect.destroy()),
    ),
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
    const initialAlpha = startHidden ? 0 : 1;
    const track = scene.add
      .image(zoomDef.pos.x, zoomDef.pos.y, "materials", "zoom-track")
      .setOrigin(0.5, 0)
      .setAlpha(initialAlpha)
      .setDepth(shadowPlane);
    const yposMin = track.getTopRight().y;
    const yAmpl = track.displayHeight;
    const dMin = min(zoomDef.depths)!;
    const dAmpl = max(zoomDef.depths)! - dMin;
    const depth = materialClass.data.depth(matDef.key);

    const depthToY = (d: number) =>
      Phaser.Math.Linear(yposMin, yposMin + yAmpl, 1 - (d - dMin) / dAmpl);

    const allDepths = zoomDef.depths.concat(matDef.depth);
    const anchors = allDepths.map((depth) =>
      scene.add
        .ellipse(zoomDef.pos.x, depthToY(depth), track.width, 20, 0xff0000)
        .setDepth(shadowPlane)
        .setAlpha(initialAlpha),
    );

    const matIcon = matDef
      .create(scene)
      .setAlpha(initialAlpha)
      .setInteractive()
      .setDepth(materialsPlane)
      .setPosition(zoomDef.pos.x, depthToY(depth.value(scene)));
    matIcon.scale = 25 / matIcon.width;
    scene.input.setDraggable(matIcon);

    const dragState = Flow.makeSceneStates();

    const magnetToNearest = () =>
      dragState.next(
        Flow.tween(() => {
          const nearestDepth = minBy(allDepths, (d) =>
            Math.abs(d - depth.value(scene)),
          )!;
          return {
            targets: matIcon,
            props: { y: depthToY(nearestDepth) },
            ease: Phaser.Math.Easing.Cubic.InOut,
            delay: 600,
          };
        }),
      );

    matIcon.on("drag", (pointer, x, y) => {
      dragState.next(Flow.noop);
      matIcon.y = Phaser.Math.Clamp(y, yposMin, yposMin + yAmpl);
    });
    matIcon.on("dragend", magnetToNearest);
    if (startHidden)
      sceneClass.data.hiddenZoomTracks.updateValue((v) => v + 1)(scene);
    const updateMatScale = () => {
      depth.setValue(
        Phaser.Math.Linear(
          dMin,
          dMin + dAmpl,
          1 - (matIcon.y - yposMin) / yAmpl,
        ),
      )(scene);
      materialClass.getObj(matDef.key)(scene).scale = 1 / depth.value(scene);
    };

    return Flow.parallel(
      Flow.handlePostUpdate({
        handler: () => updateMatScale,
      }),
      dragState.start(),
      Flow.sequence(
        Flow.wait(sceneClass.events.showZoomTracks.subject),
        Flow.parallel(
          Flow.tween({ targets: track, props: { alpha: 1 }, duration: 2000 }),
          ...anchors.map((anchor) =>
            Flow.tween({
              targets: anchor,
              props: { alpha: 1 },
              duration: 2000,
            }),
          ),
        ),
        Flow.tween({ targets: matIcon, props: { alpha: 1 }, duration: 2000 }),
        Flow.call(sceneClass.data.hiddenZoomTracks.updateValue((v) => v - 1)),
      ),
    );
  });
