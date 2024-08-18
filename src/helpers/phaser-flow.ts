import * as Phaser from "phaser";

import * as Flow from "./flow";
import _ from "lodash";
import { FuncOrConst, funcOrConstValue } from "./functional";
import { fromEvent, fromEventPattern, Observable } from "rxjs";
import { SceneContext } from "./phaser";
import { makeStatesFlow, StatesFlow } from "./animate/flow-state";
import { Maybe } from "purify-ts";
import { observeCommonGoEvent } from "/src/helpers/component";
import { makeSpawner } from "/src/helpers/flow/spawner";
import { call, sequence } from "./flow";
import { globalEvents } from "/src/scenes/common/global-events";

export * from "./flow";
export * from "./animate/move";

export type Context = Phaser.Scene;
export type PhaserNode = Flow.ActionNode<Context>;

export type SceneStatesFlow = StatesFlow<Context>;
export const makeSceneStates = () => makeStatesFlow<Context>();
export const makeSceneSpawner = () => makeSpawner<Context>();

/**
 * Runs a flow within a scene, making sure the flow is aborted when the scene is destroyed.
 * Useful when watching global events
 */
export const runScene = (scene: Context, flow: PhaserNode): void =>
  Flow.run(
    scene,
    Flow.withBackground({
      main: Flow.wait(fromEvent(scene.events, "destroy")),
      back: flow,
    }),
  );

export const tween =
  (
    configFactory: FuncOrConst<Context, Phaser.Types.Tweens.TweenBuilderConfig>,
  ): PhaserNode =>
  (scene) =>
  (params) => {
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

export const playAmbianceMusic = (params: { key: string }): PhaserNode =>
  Flow.lazy((scene) => {
    const sound = scene.sound.add(params.key, {
      loop: true,
    }) as Phaser.Sound.HTML5AudioSound;
    sound.volume = 0.01;
    return withGlobalCleanup({
      flow: Flow.sequence(
        Flow.wait(globalEvents.subSceneEntered.subject),
        Flow.call(() => sound.play()),
        waitTimer(100),
        tween(() => ({
          targets: sound,
          props: { volume: 0.1 },
          duration: 5000,
        })),
        Flow.infinite,
      ),
      cleanup: () => sound.stop(),
    });
  });

/**
 * Executes a cleanup action even when the flow aborts, unless scene is already destroyed
 */
export const withCleanup = (params: {
  flow: PhaserNode;
  cleanup: (c: Context) => void;
}): PhaserNode =>
  withGlobalCleanup({
    flow: params.flow,
    cleanup: (c) => {
      if (c.scene.scene) params.cleanup(c);
    },
  });

/**
 * Executes a cleanup action even when the flow aborts, unless scene is already destroyed
 */
export const withGlobalCleanup =
  (params: { flow: PhaserNode; cleanup: (c: Context) => void }): PhaserNode =>
  (c) =>
  (p) => {
    sequence(params.flow, call(params.cleanup))(c)(p);
    p.registerAbort(() => {
      params.cleanup(c);
    });
  };

export const waitTimer =
  (ms: number): PhaserNode =>
  (scene) =>
  (p) => {
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
  config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, "props"> & {
    props: { angle: number };
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

const arcadeGenericCollideSubject =
  (method: "overlap" | "collider") =>
  (params: {
    object1: ArcadeCollisionObject;
    object2: ArcadeCollisionObject;
    processCallback?: ArcadePhysicsCallback | undefined;
  }): SceneContext<Observable<ArcadeCollisionParams>> =>
  (scene) => {
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

export const handleEvent =
  <T extends any[]>(makeParams: {
    handler: SceneContext<(...t: T) => void>;
    emitter: SceneContext<Phaser.Events.EventEmitter>;
    event: any;
  }): PhaserNode =>
  (scene) =>
  (params) => {
    const handler = makeParams.handler(scene);
    const emitter = makeParams.emitter(scene);
    emitter.on(makeParams.event, handler);
    params.registerAbort(() =>
      emitter.removeListener(makeParams.event, handler),
    );
  };

export const handlePostUpdate = (makeParams: {
  handler: SceneContext<(time: number, delta: number) => void>;
}): PhaserNode =>
  handleEvent({
    ...makeParams,
    emitter: (scene) => scene.events,
    event: Phaser.Scenes.Events.POST_UPDATE,
  });

export const onPostUpdate = (
  handler: SceneContext<(time: number, delta: number) => void>,
): PhaserNode =>
  handleEvent({
    handler,
    emitter: (scene) => scene.events,
    event: Phaser.Scenes.Events.POST_UPDATE,
  });

export const waitOnOfPointerdown = <T>({
  items,
  getObj,
  nextFlow,
}: {
  items: T[];
  getObj: (t: T) => Phaser.GameObjects.GameObject;
  nextFlow: (t: T) => PhaserNode;
}): PhaserNode => {
  let clicked: Maybe<T> = Maybe.empty();
  return Flow.sequence(
    Flow.concurrent(
      ...items.map((item) =>
        Flow.sequence(
          Flow.wait(observeCommonGoEvent(getObj(item), "pointerdown")),
          Flow.call(() => {
            clicked = Maybe.of(item);
          }),
        ),
      ),
    ),
    Flow.lazy(() => clicked.map(nextFlow).orDefault(Flow.noop)),
  );
};
