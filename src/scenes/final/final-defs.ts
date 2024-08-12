import Vector2 = Phaser.Math.Vector2;
import { gameHeight } from "/src/scenes/common/constants";
import {
  declareGoInstance,
  defineGoSprite,
  defineSceneClass,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";

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
    nbLightReady: annotate<number>(),
  },
  events: {
    enterKidra: annotate(),
    enterKidraDone: annotate(),
    prepareGlurpAttack: annotate(),
  },
});
