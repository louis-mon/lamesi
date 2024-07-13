import * as Phaser from "phaser";

import * as Flow from "/src/helpers/phaser-flow";

import { FuncOrConst, funcOrConstValue } from "/src/helpers/functional";

// phaser cannot load durations properly
export function setUpAnimDurations(
  scene: Phaser.Scene,
  animName: string,
  durations: number[],
) {
  scene.anims.get(animName).frames.forEach((frame, i) => {
    frame.duration = durations[i];
  });
}

export const playAnim =
  (
    configFactory: FuncOrConst<
      Flow.Context,
      Phaser.Types.Animations.PlayAnimationConfig
    >,
    targets: Phaser.GameObjects.Sprite,
  ): Flow.PhaserNode =>
  (scene) =>
  (params) => {
    const config = funcOrConstValue(scene, configFactory);
    const anim = targets.play(config);
    const eventKey =
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + config.key;
    const cleaner = () => anim.removeListener(eventKey, listener);
    const abortHandler = () => {
      cleaner();
      targets.anims.stop();
    };
    const listener = () => {
      console.log("bla");
      cleaner();
      params.unregisterAbort(abortHandler);
      params.onComplete();
    };
    anim.on(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + config.key,
      listener,
    );
    params.registerAbort(abortHandler);
  };
