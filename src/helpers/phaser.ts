import * as Phaser from "phaser";
import _ from "lodash";

import Vector2Like = Phaser.Types.Math.Vector2Like;
import Vector2 = Phaser.Math.Vector2;

export type ManipulableObject =
  | Phaser.GameObjects.Shape
  | Phaser.GameObjects.Image;

export type SceneContext<T> = (scene: Phaser.Scene) => T;

export const placeAt = (
  obj: Phaser.GameObjects.Components.Transform,
  pos: Vector2Like,
) => obj.setPosition(pos.x, pos.y);

export const getObjectPosition = ({
  x,
  y,
}: Phaser.GameObjects.Components.Transform) => new Phaser.Math.Vector2(x, y);

export const createSpriteAt = (
  scene: Phaser.Scene,
  pos: Vector2,
  texture: string,
  frame?: string | number | undefined,
) => scene.add.sprite(pos.x, pos.y, texture, frame);

export const createSpriteWithPhysicsAt = (
  scene: Phaser.Scene,
  pos: Vector2,
  texture: string,
  frame?: string | number | undefined,
) => scene.physics.add.sprite(pos.x, pos.y, texture, frame);

export const createImageAt = (
  scene: Phaser.Scene,
  pos: Vector2,
  texture: string,
  frame?: string | number | undefined,
) => scene.add.image(pos.x, pos.y, texture, frame);

export const vecToXY = (vec: Phaser.Math.Vector2) => ({ x: vec.x, y: vec.y });

export const addPhysicsFromSprite = (
  scene: Phaser.Scene,
  obj: Phaser.GameObjects.Sprite,
) => scene.physics.add.existing(obj) as Phaser.Physics.Arcade.Sprite;

export const makeAnimFrames = (
  key: string,
  frames: string[],
): Phaser.Types.Animations.AnimationFrame[] =>
  frames.map((frame) => ({ frame, key }));

export const getPointerPosInMainCam = (scene: Phaser.Scene) =>
  new Vector2(scene.input.activePointer.positionToCamera(scene.cameras.main));
