import * as Phaser from "phaser";

import * as Flow from "./flow";
import _ from "lodash";
export * from "./flow";

export type Context = Phaser.Scene;
export type PhaserNode = Flow.ActionNode<Context>;

export const tween = (
  config: Phaser.Types.Tweens.TweenBuilderConfig,
): PhaserNode => (scene) => (params) => {
  scene.tweens.add({
    ...config,
    onComplete: (t, targets, param) => {
      if (config.onComplete) config.onComplete(t, targets, param);
      params.onComplete();
    },
  });
};

export const waitTimer = (ms: number): PhaserNode => (scene) => (p) => {
  scene.time.delayedCall(ms, p.onComplete);
};

/**
 * Standard tween does not work with angles, use this one instead
 */
export const rotateTween = (
  config: Phaser.Types.Tweens.TweenBuilderConfig & {
    props: { [key: string]: number };
  },
): PhaserNode => {
  const ease = Phaser.Tweens.Builders.GetEaseFunction(config.ease || "");
  return tween({
    ...config,
    props: _.mapValues(config.props, (value, prop) => {
      const targetAngle = Phaser.Math.Angle.WrapDegrees(value);
      const startAngle = config.targets[prop];

      const turnAngle = 360 - startAngle + targetAngle;
      return {
        value: targetAngle,
        ease:
          startAngle <= targetAngle
            ? ease
            : (t: number) => {
                const eased = t;
                const angle = Phaser.Math.Linear(
                  startAngle,
                  startAngle + turnAngle,
                  eased,
                );
                if (angle < 180) {
                  return (eased * turnAngle) / (targetAngle - startAngle);
                }
                return (eased * turnAngle - 360) / (targetAngle - startAngle);
              },
      };
    }),
  });
};
