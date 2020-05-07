import * as Phaser from "phaser";
import { ManipulableObject } from "../../helpers/phaser";
import { events, WithRequiredEvent } from "../global-events";

export type ObjectCreationDef = WithRequiredEvent & {
  key: string;
  create: (scene: Phaser.Scene) => ManipulableObject;
  movable?: boolean;
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
  }>;
};

export type LightSceneDef = {
  lights: LightSceneSourceDef[];
  materials: LightSceneMaterialDef[];
  goals: LightSceneGoalDef[];
};

const lightSourceSize = 10;

export const sceneDef: LightSceneDef = {
  lights: [
    {
      key: "l1",
      create: scene => scene.add.circle(125, 975, lightSourceSize, 0xfcba03)
    },
    {
      key: "l2",
      eventRequired: events.lights3,
      movable: true,
      create: scene => scene.add.circle(1250, 975, lightSourceSize, 0xfcba03)
      // start: 500, end: 1860
    }
  ],
  materials: [
    {
      key: "m-ball-1",
      depth: 0.5,
      create: scene => scene.add.circle(150, 700, 23, 0x4afc03),
      movable: true,
      rope: {
        minDepth: 0.4,
        maxDepth: 0.8
      }
    },
    {
      key: "m-triangle-1",
      depth: 0.7,
      movable: true,
      eventRequired: events.lights1,
      rope: {
        minDepth: 0.2,
        maxDepth: 0.8
      },
      create: scene => {
        const s = 1;
        return scene.add.triangle(
          1237,
          435,
          0,
          71 * s,
          41 * s,
          0,
          82 * s,
          71 * s,
          0x4afc03
        );
      }
    }
  ],
  goals: [
    {
      key: "g1",
      create: scene => scene.add.circle(1340, 253, 92, 0x4a4a4a),
      requires: [
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(1340, 253)
        }
      ]
    },
    {
      key: "g2",
      create: scene => scene.add.image(676, 444, "goal-2"),
      requires: [
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(676, 488)
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(676, 388)
        }
      ]
    },
    {
      key: "g3",
      create: scene => scene.add.image(970, 175, "goal-3"),
      requires: [
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(973, 129)
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(974, 292)
        }
      ]
    },
    {
      key: "g4",
      create: scene => scene.add.image(370, 212, "goal-4"),
      requires: [
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(224, 244)
        },
        {
          materialKey: "m-ball-1",
          position: new Phaser.Math.Vector2(224, 244)
        },
        {
          materialKey: "m-triangle-1",
          position: new Phaser.Math.Vector2(225, 134)
        }
      ]
    }
  ]
};
