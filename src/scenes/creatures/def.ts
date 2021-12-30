import Vector2 = Phaser.Math.Vector2;
import {
  customEvent,
  defineGoClass,
  defineSceneClass,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import { GlobalDataKey } from "/src/scenes/common/global-data";

export const depths = {
  treeTrunk: 10,
  treeVine: 11,
  treeBud: 20,
  treeLeaves: 30,

  potCut: 10,
  potRoot: 19,
  potBud: 20,
  potMandible: 28,
  potFront: 30,

  rocks: {
    rock: 10,
    shellBelow: 10,
    shellAbove: 20,
    algae: 30,
    ball: 21,
  },

  tentacle: 40,
  eye: 50,

  legs: {
    shell: 10,
    bud: 12,
    petal: 11,
    thornBranch: 9,
    thornLeaf: 9,
  },
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

export type BodyPart = "eye" | "mouth" | "algae" | "leg";

export const bodyPartsConfig: {
  [key in BodyPart]: {
    total: number;
    needsRotation: boolean;
    rotationOffset: number;
    requiredEvent: GlobalDataKey;
  };
} = {
  eye: {
    total: 8,
    needsRotation: false,
    rotationOffset: 0,
    requiredEvent: "creatures1",
  },
  mouth: {
    total: 3,
    needsRotation: true,
    rotationOffset: Math.PI / 2,
    requiredEvent: "creatures4",
  },
  algae: {
    total: 4,
    needsRotation: true,
    rotationOffset: 0,
    requiredEvent: "creatures3",
  },
  leg: {
    total: 6,
    needsRotation: false,
    rotationOffset: 0,
    requiredEvent: "creatures2",
  },
};

export type ElemReadyToPickParams = {
  key: string;
  bodyPart: BodyPart;
  requiredSlot?: number;
};
export const sceneClass = defineSceneClass({
  events: {
    elemReadyToPick: customEvent<ElemReadyToPickParams>(),
    syncLegs: customEvent(),
  },
  data: {},
});
