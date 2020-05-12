import * as Phaser from "phaser";

import * as flow from "./flow";
export * from "./flow";

export type Context = Phaser.Scene;
export type PhaserNode<Input = unknown, Output = unknown> = flow.ActionNode<
  Context,
  Input,
  Output
>;

export const tween = <Input>(
  makeConfig: (input: Input) => Phaser.Types.Tweens.TweenBuilderConfig,
): PhaserNode<Input, Input> => (scene) => (params) => {
  const config = makeConfig(params.input);
  const tween = scene.tweens.add({
    ...config,
    onComplete: (t, targets, param) => {
      if (config.onComplete) config.onComplete(t, targets, param);
      params.onComplete(params.input);
    },
  });
  return {
    abort: () => tween.stop(),
  };
};
