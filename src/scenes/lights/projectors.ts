import * as Flow from "/src/helpers/phaser-flow";
import {
  LightSceneMaterialDef,
  materialClass,
  materialsPlane,
  shadowPlane,
} from "/src/scenes/lights/lights-def";
import { isEventReady } from "/src/scenes/common/events-def";
import Phaser from "phaser";

export const projectorFlow = (matDef: LightSceneMaterialDef): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const zoomDef = matDef.zoom;
    if (!zoomDef || !isEventReady(zoomDef.eventRequired)(scene)) {
      return Flow.noop;
    }
    const track = scene.add
      .image(zoomDef.pos.x, zoomDef.pos.y, "materials", "projector-track")
      .setOrigin(0.5, 0)
      .setDepth(shadowPlane);
    const yposMin = track.getTopRight().y;
    const yAmpl = track.displayHeight;
    const dMin = zoomDef.minDepth;
    const dAmpl = zoomDef.maxDepth - dMin;
    const depth = materialClass.data.depth(matDef.key);

    const ropeIcon = matDef
      .create(scene)
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
    ropeIcon.scale = 25 / ropeIcon.width;
    scene.input.setDraggable(ropeIcon);

    ropeIcon.on("drag", (pointer, x, y) => {
      ropeIcon.y = Phaser.Math.Clamp(y, yposMin, yposMin + yAmpl);
      depth.setValue(
        Phaser.Math.Linear(
          dMin,
          dMin + dAmpl,
          1 - (ropeIcon.y - yposMin) / yAmpl,
        ),
      )(scene);
      materialClass.getObj(matDef.key)(scene).scale = 1 / depth.value(scene);
    });
    return Flow.noop;
  });
