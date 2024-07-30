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
  movable?: boolean;
};

export type LightSceneSourceDef = ObjectCreationDef & {
  position: Vector2;
  movablePath?: { path: Phaser.Curves.Path; pos: number };
};

export type LightSceneZoomDef = WithRequiredEvent & {
  pos: Vector2;
  depths: number[];
};

export type LightSceneMaterialDef = ObjectCreationDef & {
  getPoints: () => Phaser.Geom.Point[];
  getContourPoints?: () => Phaser.Geom.Point[];
  create: (scene: Phaser.Scene) => Phaser.GameObjects.Shape;
  depth: number;
  zoom?: LightSceneZoomDef;
};

export type LightSceneGoalDef = ObjectCreationDef & {
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

export const vortexPlane = 0;
export const goalHiddenObjectPlane = vortexPlane;
export const goalPlane = vortexPlane + 1;
export const shadowPlane = goalPlane + 1;
export const materialsPlane = shadowPlane + 1;
export const ambiancePlane = materialsPlane + 1;
export const sourcesPathPlane = ambiancePlane + 1;
export const sourcesPlane = sourcesPathPlane + 1;
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
const barRefWidth = 46;

const circle = new Phaser.Geom.Circle(0, 0, 23);

const triangle = new Phaser.Geom.Triangle(0, 71, 41, 0, 82, 71);

const rectangle = new Phaser.Geom.Rectangle(0, 0, barRefWidth, barRefWidth * 2);
export const sceneDef: LightSceneDef = {
  lights: [
    {
      key: "l1",
      eventRequired: "lights1",
      position: new Vector2(125, 975),
    },
    {
      key: "l2",
      eventRequired: "lights4",
      position: new Vector2(1250, 975),
      movablePath: {
        path: new Phaser.Curves.Path(1780, 975)
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
      getPoints: () => circle.getPoints(12),
      getContourPoints: () => circle.getPoints(0, 5),
      create: (scene) => scene.add.circle(150, 700, 23, 0x4afc03),
      movable: true,
      zoom: {
        pos: new Vector2(gameWidth - 40, 50),
        eventRequired: "lights3",
        depths: makeZoomDepths(
          [0.35, 0.46, 0.55, 0.64, 0.75],
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
        pos: new Vector2(gameWidth - 40, gameHeight / 2 + 50),
        eventRequired: "lights3",
        depths: makeZoomDepths(
          [0.59, 0.62, 0.67, 0.73, 0.75, 0.8],
          [g3TriangleWidth, g4TriangleWidth, g5TriangleWidth],
          82,
        ),
      },
      getPoints: () => [
        new Phaser.Geom.Point(triangle.x1, triangle.y1),
        new Phaser.Geom.Point(triangle.x2, triangle.y2),
        new Phaser.Geom.Point(triangle.x3, triangle.y3),
      ],
      create: (scene) =>
        scene.add.triangle(1237, 435, 0, 71, 41, 0, 82, 71, 0x0033ff),
    },
    {
      key: "m-bar-1",
      depth: 0.92,
      movable: true,
      eventRequired: "lights5",
      zoom: {
        pos: new Vector2(gameWidth - 90, gameHeight * 0.28),
        eventRequired: "lights3",
        depths: makeZoomDepths(
          [0.78, 0.81, 0.89, 0.95, 0.98],
          [g5BarWidth],
          barRefWidth,
        ),
      },
      create: (scene) =>
        scene.add.rectangle(500, 500, barRefWidth, barRefWidth * 2, 0xff0000),
      getPoints: () => [
        new Phaser.Geom.Point(rectangle.left, rectangle.top),
        new Phaser.Geom.Point(rectangle.right, rectangle.top),
        new Phaser.Geom.Point(rectangle.right, rectangle.bottom),
        new Phaser.Geom.Point(rectangle.left, rectangle.bottom),
      ],
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
