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
      create: scene => scene.add.circle(150, 700, 47, 0x4afc03),
      movable: true
    },
    {
      // change to depth 0.3
      key: "m-triangle-1",
      depth: 0.5,
      movable: true,
      eventRequired: events.lights1,
      create: scene =>
        scene.add.triangle(1537, 935, 0, 71, 41, 0, 82, 71, 0x4afc03)
    },
    {
      key: "m-triangle-2", // merge with triangle 1
      depth: 0.5,
      movable: true,
      eventRequired: events.lights2,
      create: scene =>
        scene.add.triangle(
          1237,
          435,
          0,
          71 * 0.5,
          41 * 0.5,
          0,
          82 * 0.5,
          71 * 0.5,
          0x4afc03
        )
    }
  ],
  goals: [
    {
      key: "g1",
      create: scene => scene.add.circle(1340, 253, 47 * 2, 0x7b03fc),
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
          position: new Phaser.Math.Vector2(676, 380)
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
          materialKey: "m-triangle-2",
          position: new Phaser.Math.Vector2(973, 294)
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
