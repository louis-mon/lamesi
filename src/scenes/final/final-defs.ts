import { gameHeight } from "/src/scenes/common/constants";
import {
  customEvent,
  declareGoInstance,
  defineGoObject,
  defineGoSprite,
  defineSceneClass,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;
import * as Flow from "/src/helpers/phaser-flow";

export interface LegAngleState {
  thighAngle: number;
  calfAngle: number;
}

export interface LegState extends LegAngleState {
  thighObj: Phaser.GameObjects.Image;
  calfObj: Phaser.GameObjects.Image;
}

export interface ArmAngleState {
  armBodyAngle: number;
  arm1Arm2Angle: number;
}

export interface Kidra extends ArmAngleState {
  head: Phaser.Physics.Arcade.Image;
  body: Phaser.GameObjects.Image;
  arm1: Phaser.GameObjects.Image;
  arm2: Phaser.GameObjects.Image;
  weapon: Phaser.GameObjects.Image;
  leftLeg: LegState;
  rightLeg: LegState;
  pos: Vector2;
  bodyAngle: number;
  headBodyAngle: number;
  standingFoot?: "right" | "left";
  downFoot: boolean;
  battleState: Flow.SceneStatesFlow;
  headState: Flow.SceneStatesFlow;
  legsState: Flow.SceneStatesFlow;
  hitCount: number;
  weaponAttached: boolean;
}

export const glurpInitPos = new Vector2(-400, gameHeight / 2);

export const finalDepths = {
  kidraUpperBody: 10,
  ghost: 10,
};

export const womanClass = defineGoSprite({
  data: {},
  events: {},
});

export const woman = declareGoInstance(womanClass, "woman");

export interface FinalAttackState {
  particles: Phaser.GameObjects.Particles.ParticleEmitterManager;
}

export interface LightBallReady {
  lightBall: Phaser.Physics.Arcade.Image;
}

export const finalMinionClass = defineGoObject({
  data: {},
  events: {
    eat: customEvent(),
  },
});

export const finalSceneClass = defineSceneClass({
  data: {
    attack: annotate<FinalAttackState>(),
    kidra: annotate<Kidra>(),
    nbLightReady: annotate<number>(),
    lightBalls: annotate<Phaser.Physics.Arcade.Group>(),
    lightBallReady: annotate<LightBallReady | null>(),
    lightBallCharge: annotate<number>(),
    glurpTargets: annotate<Array<Phaser.Physics.Arcade.Sprite>>(),
  },
  events: {
    enterKidra: customEvent(),
    enterKidraDone: customEvent(),
    kidraCallMinions: customEvent(),
    prepareGlurpAttack: customEvent(),
    destroyBall: customEvent<{ respawn: boolean }>(),
    kidraDead: customEvent(),
    runCredits: customEvent(),
    ghostAppear: customEvent(),
  },
});
