import Vector2 = Phaser.Math.Vector2;
import {
  customEvent,
  defineGoClass,
  defineSceneClass,
} from "/src/helpers/component";
import { ManipulableObject } from "/src/helpers/phaser";
import { annotate } from "/src/helpers/typing";

export const depths = {
  treeTrunk: 10,
  treeVine: 11,
  treeBud: 20,
  treeLeaves: 30,

  potCut: 10,
  potRoot: 19,
  potBud: 20,
  potFront: 30,

  tentacle: 40,
  eye: 50,
};

export type CreatureMoveCommand = {
  pos: () => Vector2;
  rotation: () => number;
};

export const movableElementClass = defineGoClass({
  kind: annotate<
    Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform
  >(),
  data: {
    move: annotate<CreatureMoveCommand>(),
  },
  events: {},
});

export type BodyPart = "eye" | "mouth";

export const bodyPartsConfig: { [key in BodyPart]: { total: number } } = {
  eye: { total: 8 },
  mouth: { total: 3 },
};

export type ElemReadyToPickParams = { key: string; bodyPart: BodyPart };
export const sceneClass = defineSceneClass({
  events: {
    elemReadyToPick: customEvent<ElemReadyToPickParams>(),
  },
  data: {},
});
