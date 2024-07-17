import Phaser from "phaser";

import { createImageAt, getObjectPosition, vecToXY } from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { getProp } from "/src/helpers/functional";
import * as Def from "../def";
import _, { range } from "lodash";
import Vector2 = Phaser.Math.Vector2;
import {
  AlgaeController,
  createAlgae,
} from "/src/scenes/creatures/algae/algae";
import { moveTo } from "/src/helpers/animate/move";
import { globalData } from "/src/scenes/common/global-data";
import DegToRad = Phaser.Math.DegToRad;
import { isEventReady, isEventSolved } from "/src/scenes/common/events-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { manDeskPos, moveMan } from "/src/scenes/creatures/man";
import { cutscene } from "/src/scenes/common/cutscene";

export interface IncubatorState {
  base: Phaser.GameObjects.Sprite;
  teeth: Phaser.GameObjects.Sprite[];
  root: Phaser.GameObjects.Container;
  mask: Phaser.Display.Masks.GeometryMask;
}

export function createIncubator(
  scene: Phaser.Scene,
  { pos }: { pos: Vector2 },
): IncubatorState {
  const root = scene.add
    .container(pos.x, pos.y)
    .setSize(80, 80)
    .setInteractive();
  const teeth = range(6).map((i) =>
    scene.add.sprite(0, 0, "rocks", "egg-teeth").setRotation((i * Math.PI) / 3),
  );
  const base = scene.add
    .sprite(0, 0, "rocks", "egg-base")
    .setDepth(Def.depths.rocks.rock);
  root.add(base);
  teeth.forEach((c) => root.add(c));
  const circle = scene.add
    .graphics({ x: pos.x, y: pos.y })
    .fillCircle(0, 0, 32)
    .setVisible(false);
  root.add(circle);
  const mask = circle.createGeometryMask();
  teeth.forEach((t) => t.setMask(mask));
  return {
    base,
    mask,
    root,
    teeth,
  };
}

export function openIncubator(incubator: IncubatorState): Flow.PhaserNode {
  return Flow.parallel(
    ...incubator.teeth.map((tooth, i) =>
      Flow.moveTo({
        dest: new Vector2().setToPolar((i * Math.PI) / 3, 40),
        target: tooth,
        speed: 30,
        ease: Phaser.Math.Easing.Quadratic.In,
      }),
    ),
  );
}

export function closeIncubator(incubator: IncubatorState): Flow.PhaserNode {
  return Flow.parallel(
    ...incubator.teeth.map((tooth, i) =>
      Flow.moveTo({
        dest: new Vector2(0, 0),
        target: tooth,
        speed: 30,
        ease: Phaser.Math.Easing.Quadratic.Out,
      }),
    ),
  );
}
