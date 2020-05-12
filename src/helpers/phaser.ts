import * as Phaser from "phaser";
import _ from "lodash";

import Vector2Like = Phaser.Types.Math.Vector2Like;
import Vector2 = Phaser.Math.Vector2;

export type ManipulableObject =
  | Phaser.GameObjects.Shape
  | Phaser.GameObjects.Image;

export const placeAt = (
  obj: Phaser.GameObjects.Components.Transform,
  pos: Vector2Like,
) => obj.setPosition(pos.x, pos.y);

export const createSpriteAt = (
  scene: Phaser.Scene,
  pos: Vector2,
  texture: string,
  frame?: string | number | undefined,
) => scene.add.sprite(pos.x, pos.y, texture, frame);

export const createImageAt = (
  scene: Phaser.Scene,
  pos: Vector2,
  texture: string,
  frame?: string | number | undefined,
) => scene.add.image(pos.x, pos.y, texture, frame);

export const vecToXY = (vec: Phaser.Math.Vector2) => ({ x: vec.x, y: vec.y });
