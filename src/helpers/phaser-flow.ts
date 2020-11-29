import * as Phaser from "phaser";

import * as Flow from "./flow";
import _ from "lodash";
import { FuncOrConst, funcOrConstValue } from "./functional";
import { fromEventPattern, Observable } from "rxjs";
import { SceneContext } from "./phaser";
import { NodeEventHandler } from "rxjs/internal/observable/fromEvent";
export * from "./flow";

export type Context = Phaser.Scene;
export type PhaserNode = Flow.ActionNode<Context>;

export const tween = (
  configFactory: FuncOrConst<Context, Phaser.Types.Tweens.TweenBuilderConfig>,
): PhaserNode => (scene) => (params) => {
  const config = funcOrConstValue(scene, configFactory);
  const abortHandler = () => tween.stop();
  const tween = scene.tweens.add({
    ...config,
    onComplete: (t, targets, param) => {
      params.unregisterAbort(abortHandler);
      if (config.onComplete) config.onComplete(t, targets, param);
      params.onComplete();
    },
  });
  params.registerAbort(abortHandler);
};

export const waitTimer = (ms: number): PhaserNode => (scene) => (p) => {
  const abortHandler = () => timer.remove();
  const timer = scene.time.delayedCall(ms, () => {
    p.unregisterAbort(abortHandler);
    p.onComplete();
  });
  p.registerAbort(abortHandler);
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

type ArcadeCollisionObject =
  | Phaser.GameObjects.Group
  | Phaser.GameObjects.GameObject
  | Phaser.GameObjects.GameObject[]
  | Phaser.GameObjects.Group[];
type ArcadeCollisionParams = {
  object1: Phaser.Types.Physics.Arcade.GameObjectWithBody;
  object2: Phaser.Types.Physics.Arcade.GameObjectWithBody;
  getObjects(): Phaser.GameObjects.GameObject[];
};

const arcadeGenericCollideSubject = (
  method: "overlap" | "collider",
) => (params: {
  object1: ArcadeCollisionObject;
  object2: ArcadeCollisionObject;
  processCallback?: ArcadePhysicsCallback | undefined;
}): SceneContext<Observable<ArcadeCollisionParams>> => (scene) => {
  return fromEventPattern(
    (handler) =>
      scene.physics.add[method](params.object1, params.object2, handler),
    (handler, collider) => collider.destroy(),
    (object1, object2) => ({
      object1,
      object2,
      getObjects: () => [object1, object2],
    }),
  );
};

export const arcadeOverlapSubject = arcadeGenericCollideSubject("overlap");

export const arcadeColliderSubject = arcadeGenericCollideSubject("collider");
