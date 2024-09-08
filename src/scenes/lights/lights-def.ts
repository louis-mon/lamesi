import * as Phaser from "phaser";
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
    hideMaterials: customEvent(),
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
  cover: Array<Array<Vector2>>;
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

export const muralsPlane = 0;
export const coverPlane = muralsPlane + 1;
export const vortexPlane = coverPlane + 1;
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
      cover: [
        [
          new Vector2(1228.22, -1.21),
          new Vector2(1126.17, 323.15),
          new Vector2(941.51, 553.97),
          new Vector2(976.74, 659.66),
          new Vector2(1440.82, 724.05),
          new Vector2(1573.24, 618.36),
          new Vector2(1574.45, 274.56),
        ],
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
      cover: [
        [
          new Vector2(666.95, 174.94),
          new Vector2(544.25, 251.47),
          new Vector2(366.89, 524.81),
          new Vector2(324.37, 637.8),
          new Vector2(581.91, 744.7),
          new Vector2(886.84, 630.51),
          new Vector2(922.07, 397.26),
          new Vector2(788.44, 198.02),
        ],
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
      cover: [
        [
          new Vector2(574.63, 1.21),
          new Vector2(607.43, 181.01),
          new Vector2(782.37, 216.24),
          new Vector2(885.63, 382.68),
          new Vector2(878.34, 628.08),
          new Vector2(555.19, 739.84),
          new Vector2(671.81, 820.02),
          new Vector2(1037.48, 641.44),
          new Vector2(1027.77, 529.67),
          new Vector2(1151.68, 399.69),
          new Vector2(1596.32, 402.11),
          new Vector2(1451.75, 0.0),
        ],
        [
          new Vector2(0.0, 654.8),
          new Vector2(0, 1080),
          new Vector2(750.78, 1080),
          new Vector2(722.84, 794.51),
          new Vector2(276.99, 592.85),
        ],
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
      cover: [
        [
          new Vector2(0, 0),
          new Vector2(0, 675.46),
          new Vector2(338.94, 654.8),
          new Vector2(612.29, 252.69),
          new Vector2(652.66, 206.52),
          new Vector2(783.58, 217.46),
          new Vector2(817.6, 161.57),
          new Vector2(806.66, 0),
        ],
        [
          new Vector2(974.31, 630.51),
          new Vector2(600.14, 872.26),
          new Vector2(584.34, 1080),
          new Vector2(1503.99, 1088.13),
          new Vector2(1505.2, 716.76),
        ],
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
      cover: [
        [
          new Vector2(1420.16, 0),
          new Vector2(1561.09, 289.13),
          new Vector2(1548.94, 614.71),
          new Vector2(1428.67, 782.36),
          new Vector2(1446.89, 1080),
          new Vector2(1920, 1084.49),
          new Vector2(1920, 0),
        ],
      ],
    },
  ],
};
