import { gameHeight } from "/src/scenes/common/constants";
import {
  declareGoInstance,
  defineGoSprite,
  defineSceneClass,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

export interface LegAngleState {
  thighAngle: number;
  calfAngle: number;
}

export interface LegState extends LegAngleState {
  thighObj: Phaser.Physics.Arcade.Image;
  calfObj: Phaser.Physics.Arcade.Image;
}

export interface ArmAngleState {
  armBodyAngle: number;
  arm1Arm2Angle: number;
}

export interface Kidra extends ArmAngleState {
  head: Phaser.Physics.Arcade.Image;
  body: Phaser.Physics.Arcade.Image;
  arm1: Phaser.Physics.Arcade.Image;
  arm2: Phaser.Physics.Arcade.Image;
  weapon: Phaser.Physics.Arcade.Image;
  leftLeg: LegState;
  rightLeg: LegState;
  pos: Vector2;
  headBodyAngle: number;
  standingFoot: "right" | "left";
  downFoot: boolean;
}

export const glurpInitPos = new Vector2(-400, gameHeight / 2);

export const womanClass = defineGoSprite({
  data: {},
  events: {},
});

export const woman = declareGoInstance(womanClass, "woman");

export interface FinalAttackState {
  particles: Phaser.GameObjects.Particles.ParticleEmitterManager;
}

export const finalSceneClass = defineSceneClass({
  data: {
    attack: annotate<FinalAttackState>(),
    kidra: annotate<Kidra>(),
    nbLightReady: annotate<number>(),
  },
  events: {
    enterKidra: annotate(),
    enterKidraDone: annotate(),
    prepareGlurpAttack: annotate(),
    runCredits: annotate(),
  },
});
