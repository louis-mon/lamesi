import * as Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import {
  getObjectPosition,
  ManipulableObject,
  placeAt,
  SceneContext,
} from "../phaser";
import * as Flow from "/src/helpers/phaser-flow";

export const followPosition = ({
  getPos,
  target,
}: {
  getPos: SceneContext<Phaser.Types.Math.Vector2Like>;
  target: SceneContext<Phaser.GameObjects.Components.Transform>;
}): Flow.PhaserNode =>
  Flow.handlePostUpdate({
    handler: (scene) => () => {
      placeAt(target(scene), getPos(scene));
    },
  });

export const followRotation = ({
  getRotation,
  target,
}: {
  getRotation: SceneContext<number>;
  target: SceneContext<Phaser.GameObjects.Components.Transform>;
}): Flow.PhaserNode =>
  Flow.handlePostUpdate({
    handler: (scene) => () => {
      target(scene).setRotation(getRotation(scene));
    },
  });

export const followObject = ({
  source,
  target,
  offset,
}: {
  source: SceneContext<ManipulableObject>;
  target: SceneContext<ManipulableObject>;
  offset: Vector2;
}): Flow.PhaserNode =>
  followPosition({
    target,
    getPos: (scene) => getObjectPosition(source(scene)).add(offset),
  });
