import * as Phaser from "phaser";

import * as flow from "./flow";
export * from "./flow";

export type Context = Phaser.Scene;
export type PhaserNode = flow.ActionNode<Context>;

export const tween = (
  makeConfig: Phaser.Types.Tweens.TweenBuilderConfig,
): PhaserNode => (scene) => (params) => {
  const config = makeConfig;
  const tween = scene.tweens.add({
    ...config,
    onComplete: (t, targets, param) => {
      if (config.onComplete) config.onComplete(t, targets, param);
      params.onComplete();
    },
  });
  params.onStart({
    abort: () => tween.stop(),
  });
};

export const waitForEvent = (params: {
  emitter: Phaser.Events.EventEmitter;
  event: string;
}): PhaserNode => () => (p) => {
  const emitter = params.emitter;
  emitter.once(params.event, p.onComplete);
  p.onStart({
    abort: () => emitter.off(params.event, p.onComplete),
  });
};
