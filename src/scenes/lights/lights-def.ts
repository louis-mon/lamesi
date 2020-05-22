import * as Phaser from "phaser";
import { ManipulableObject } from "../../helpers/phaser";
import { events, WithRequiredEvent } from "../global-events";

export type ObjectCreationDef = WithRequiredEvent & {
  key: string;
  create: (scene: Phaser.Scene) => ManipulableObject;
  movable?: boolean;
  movablePath?: { path: Phaser.Curves.Path; pos: number };
};

export type LightSceneSourceDef = ObjectCreationDef;

export type LightSceneMaterialDef = ObjectCreationDef & {
  depth: number;
  rope?: {
    minDepth: number;
    maxDepth: number;
  };
};

export type LightSceneGoalDef = ObjectCreationDef & {
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

export const sceneDef: LightSceneDef = {
  lights: [
    {
      key: "l1",
      create: (scene) => scene.add.circle(125, 975, lightSourceSize, 0xfcba03),
    },
    {
      key: "l2",
      eventRequired: 'lights3',
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
      depth: 0.5,
      create: (scene) => scene.add.circle(150, 700, 23, 0x4afc03),
      movable: true,
      rope: {
        minDepth: 0.4,
        maxDepth: 0.8,
      },
    },
    {
      key: "m-triangle-1",
      depth: 0.7,
      movable: true,
      eventRequired: 'lights1',
      rope: {
        minDepth: 0.2,
        maxDepth: 0.9,
      },
      create: (scene) =>
        scene.add.triangle(1237, 435, 0, 71, 41, 0, 82, 71, 0x4afc03),
    },
    {
      key: "m-bar-1",
      depth: 0.5,
      movable: true,
      eventRequired: 'lights4',
      rope: {
        minDepth: 0.4,
        maxDepth: 0.9,
      },
      create: (scene) => scene.add.rectangle(500, 500, 46, 92, 0x4afc03),
    },
  ],
  goals: [
    {
      key: "g1",
      create: (scene) => scene.add.circle(1340, 253, 92, 0x4a4a4a),
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
      create: (scene) => scene.add.image(970, 175, "goal-3"),
      requires: [
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(973, 135),
          width: 271,
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(975, 278),
          width: 138,
        },
      ],
    },
    {
      key: "g4",
      create: (scene) => scene.add.image(370, 212, "goal-4"),
      requires: [
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(315, 268),
          width: 132,
        },
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(435, 268),
          width: 132,
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(377, 146),
          width: 134,
        },
      ],
    },
    {
      key: "g5",
      create: (scene) => scene.add.image(1695, 218, "goal-5"),
      requires: [
        {
          materialKey: "m-bar-1",
          position: new Phaser.Math.Vector2(1695, 246),
          width: 64,
        },
        {
          materialKey: "m-bar-1",
          position: new Phaser.Math.Vector2(1695, 342),
          width: 64,
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(1695, 82),
          width: 133,
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(1695, 228),
          width: 133,
        },
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(1695, 131),
          width: 94,
        },
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(1695, 360),
          width: 94,
        },
      ],
    },
  ],
};
