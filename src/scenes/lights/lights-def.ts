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

const lightSourceSize = 7;

export const sceneDef: LightSceneDef = {
  lights: [
    {
      key: "l1",
      create: scene => scene.add.circle(125, 975, lightSourceSize, 0xfcba03)
    }
  ],
  materials: [
    {
      key: "m1",
      depth: 0.5,
      create: scene => scene.add.circle(150, 700, 47, 0x4afc03),
      movable: true
    }
  ],
  goals: [
    {
      key: "g1",
      create: scene => scene.add.circle(1340, 253, 47 * 2, 0x7b03fc),
      requires: [
        {
          materialKey: "m1",
          position: new Phaser.Math.Vector2(1340, 253)
        }
      ]
    }
  ]
};

export const sceneDefTest: LightSceneDef = {
  lights: [
    {
      key: "l1",
      create: scene => scene.add.circle(40, 100, lightSourceSize, 0xfcba03)
    },
    {
      key: "l2",
      eventRequired: events.lights2,
      create: scene => scene.add.circle(200, 440, lightSourceSize, 0xfcba03)
    }
  ],
  materials: [
    {
      key: "m1",
      depth: 0.5,
      create: scene => scene.add.circle(430, 350, 13, 0x4afc03)
    },
    {
      key: "m2",
      depth: 0.7,
      create: scene => scene.add.circle(300, 200, 15, 0x4afc03),
      eventRequired: events.lights1
    }
  ],
  goals: [
    {
      key: "o1",
      create: scene => scene.add.circle(300, 100, 26, 0x7b03fc),
      requires: [
        {
          materialKey: "m1",
          position: new Phaser.Math.Vector2(300, 100)
        }
      ]
    }
  ]
};
