import * as Phaser from "phaser";
import { ManipulableObject } from "/src/helpers/phaser";
import { WithRequiredEvent } from "../common/global-data";
import Image = Phaser.GameObjects.Image;
import Vector2 = Phaser.Math.Vector2;
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import {
  customEvent,
  defineGoImage,
  defineSceneClass,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";

export const sceneClass = defineSceneClass({
  events: {
    showZoomTracks: customEvent(),
  },
  data: {
    hiddenZoomTracks: annotate<number>(),
  },
});

export const materialClass = defineGoImage({
  data: {
    depth: annotate<number>(),
  },
  events: {},
});

export type ObjectCreationDef = WithRequiredEvent & {
  key: string;
  create: (scene: Phaser.Scene) => ManipulableObject;
  movable?: boolean;
  movablePath?: { path: Phaser.Curves.Path; pos: number };
};

export type LightSceneSourceDef = ObjectCreationDef;

export type LightSceneZoomDef = WithRequiredEvent & {
  pos: Vector2;
  depths: number[];
};

export type LightSceneMaterialDef = ObjectCreationDef & {
  depth: number;
  zoom?: LightSceneZoomDef;
};

export type LightSceneGoalDef = Omit<ObjectCreationDef, "create"> & {
  create: (scene: Phaser.Scene) => Image;
  requires: Array<{
    materialKey: string;
    position: Phaser.Math.Vector2;
    width: number;
  }>;
};

export type LightSceneDef = {
  lights: LightSceneSourceDef[];
  materials: LightSceneMaterialDef[];
  goals: LightSceneGoalDef[];
};

const lightSourceSize = 30;

export const vortexPlane = 0;
export const goalHiddenObjectPlane = vortexPlane;
export const goalPlane = vortexPlane + 1;
export const shadowPlane = goalPlane + 1;
export const materialsPlane = shadowPlane + 1;
export const sourcesPlane = materialsPlane + 1;
export const curtainsPlane = sourcesPlane + 1;

export const shadowName = (matKey: string, sourceDef: LightSceneSourceDef) =>
  `${matKey}-${sourceDef.key}-shadow`;

const makeZoomDepths = (other: number[], widths: number[], refWidth: number) =>
  other.concat(widths.map((w) => Math.sqrt(refWidth / w)));

const g3BallWidth = 271;
const g4BallWidth = 132;
const g5BallWidth = 94;

const g3TriangleWidth = 138;
const g4TriangleWidth = 198;
const g5TriangleWidth = 133;

const g5BarWidth = 64;

export const sceneDef: LightSceneDef = {
  lights: [
    {
      key: "l1",
      eventRequired: "lights1",
      create: (scene) => scene.add.circle(125, 975, lightSourceSize, 0xfcba03),
    },
    {
      key: "l2",
      eventRequired: "lights4",
      create: (scene) => scene.add.circle(1250, 975, lightSourceSize, 0xfcba03),
      movablePath: {
        path: new Phaser.Curves.Path(1880, 975)
          .lineTo(240, 975)
          .ellipseTo(39, 39, 0, 90, false, 90)
          .ellipseTo(39, 39, 0, -90, true)
          .ellipseTo(39, 39, 0, 90, false, 90)
          .lineTo(125, 200),
        pos: 500,
      },
    },
  ],
  materials: [
    {
      key: "m-ball-1",
      eventRequired: "lights1",
      depth: 0.5,
      create: (scene) => scene.add.circle(150, 700, 23, 0x4afc03),
      movable: true,
      zoom: {
        pos: new Vector2(gameWidth - 50, 50),
        eventRequired: "lights3",
        depths: makeZoomDepths(
          [0.35, 0.75],
          [g3BallWidth, g4BallWidth, g5BallWidth],
          46,
        ),
      },
    },
    {
      key: "m-triangle-1",
      depth: 0.7,
      movable: true,
      eventRequired: "lights2",
      zoom: {
        pos: new Vector2(gameWidth - 50, gameHeight / 2 + 50),
        eventRequired: "lights3",
        depths: makeZoomDepths(
          [0.59, 0.8],
          [g3TriangleWidth, g4TriangleWidth, g5TriangleWidth],
          82,
        ),
      },
      create: (scene) =>
        scene.add.triangle(1237, 435, 0, 71, 41, 0, 82, 71, 0x4afc03),
    },
    {
      key: "m-bar-1",
      depth: 0.5,
      movable: true,
      eventRequired: "lights5",
      zoom: {
        pos: new Vector2(gameWidth - 80, gameHeight * 0.28),
        eventRequired: "lights3",
        depths: makeZoomDepths([0.4, 0.9], [g5BarWidth], 46),
      },
      create: (scene) => scene.add.rectangle(500, 500, 46, 92, 0x4afc03),
    },
  ],
  goals: [
    {
      key: "g1",
      eventRequired: "lights1",
      create: (scene) => scene.add.image(1340, 253, "goal-1"),
      requires: [
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(1340, 253),
          width: 184,
        },
      ],
    },
    {
      key: "g2",
      eventRequired: "lights2",
      create: (scene) => scene.add.image(676, 444, "goal-2"),
      requires: [
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(676, 488),
          width: 184,
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(676, 388),
          width: 167,
        },
      ],
    },
    {
      key: "g3",
      eventRequired: "lights3",
      create: (scene) => scene.add.image(970, 175, "goal-3"),
      requires: [
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(973, 135),
          width: g3BallWidth,
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(975, 278),
          width: g3TriangleWidth,
        },
      ],
    },
    {
      key: "g4",
      eventRequired: "lights4",
      create: (scene) => scene.add.image(370, 212, "goal-4"),
      requires: [
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(310, 189),
          width: g4BallWidth,
        },
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(430, 189),
          width: g4BallWidth,
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(321, 214),
          width: g4TriangleWidth,
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(418, 214),
          width: g4TriangleWidth,
        },
      ],
    },
    {
      key: "g5",
      eventRequired: "lights5",
      create: (scene) => scene.add.image(1695, 218, "goal-5"),
      requires: [
        {
          materialKey: "m-bar-1",
          position: new Phaser.Math.Vector2(1695, 246),
          width: g5BarWidth,
        },
        {
          materialKey: "m-bar-1",
          position: new Phaser.Math.Vector2(1695, 342),
          width: g5BarWidth,
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(1695, 82),
          width: g5TriangleWidth,
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(1695, 228),
          width: g5TriangleWidth,
        },
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(1695, 131),
          width: g5BallWidth,
        },
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(1695, 360),
          width: g5BallWidth,
        },
      ],
    },
  ],
};
