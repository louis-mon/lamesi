import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { createSpriteAt, getObjectPosition } from "/src/helpers/phaser";
import { finalSceneClass, woman } from "/src/scenes/final/final-defs";
import Vector2 = Phaser.Math.Vector2;
import { creatureSceneClass } from "/src/scenes/creatures/def";
import { setUpAnimDurations } from "/src/helpers/animate/play-anim";
import { commonInputEvents } from "/src/helpers/component";
import { ghostFlow } from "/src/scenes/final/ghost-flow";
import Color = Phaser.Display.Color;

export const jumpOntoGlurp: Flow.PhaserNode = Flow.lazy((scene) => {
  const glurpObj = creatureSceneClass.data.glurpObj.value(scene);
  const womanObj = woman.getObj(scene);

  const A: Vector2 = getObjectPosition(womanObj);
  const B: Vector2 = new Vector2(828, 240);
  const C: Vector2 = getObjectPosition(glurpObj);

  // Coefficients for x(t)
  const ax: number = 2 * (C.x - 2 * B.x + A.x);
  const bx: number = -3 * A.x + 4 * B.x - C.x;
  const cx: number = A.x;

  // Coefficients for y(t)
  const ay: number = 2 * (C.y - 2 * B.y + A.y);
  const by: number = -3 * A.y + 4 * B.y - C.y;
  const cy: number = A.y;

  const posSetter = {
    value_: 0,
    set value(t: number) {
      womanObj.x = ax * t * t + bx * t + cx;
      womanObj.y = ay * t * t + by * t + cy;
      this.value_ = t;
    },
    get value() {
      return this.value_;
    },
  };

  womanObj.flipX = true;

  return Flow.sequence(
    Flow.tween({
      targets: posSetter,
      props: { value: 1 },
      duration: 1200,
    }),
    Flow.call(() => {
      womanObj.flipX = false;
    }),
    Flow.waitTimer(1000),
    prepareGlurpAttack,
  );
});

const prepareGlurpAttack: Flow.PhaserNode = Flow.sequence(
  Flow.call((scene) => {
    const womanObj = woman.getObj(scene);
    womanObj.play("slash-ready");
  }),
  Flow.call(finalSceneClass.events.prepareGlurpAttack.emit({})),
  Flow.call(finalSceneClass.data.nbLightReady.setValue(0)),
);

export const lightBallReady: Flow.PhaserNode = Flow.lazy((scene) =>
  Flow.observe(finalSceneClass.data.nbLightReady.subject(scene), (nb) => {
    if (nb < 4) {
      return Flow.noop;
    }
    const womanObj = woman.getObj(scene);
    const pos = womanObj.getTopLeft().add(new Vector2(9, 9));
    const lightBall = scene.physics.add
      .image(pos.x, pos.y, "fight", "light-ball")
      .setScale(0)
      .setImmovable(true);
    const attack = finalSceneClass.data.attack.value(scene);
    finalSceneClass.data.lightBallCharge.setValue(0)(scene);
    finalSceneClass.data.lightBallReady.setValue({ lightBall })(scene);
    const scale = 0.58;

    const getCharge = () => finalSceneClass.data.lightBallCharge.value(scene);
    const getZoomModifier = () => getCharge() * 1.6 + 1;
    const getResolvedScale = () => scale * getZoomModifier();

    attack.particles.emitters.removeAll();
    const hexManager = scene.add.particles("fight", "light-hex").setDepth(1000);
    const sparkManager = scene.add
      .particles("fight", "light-particle")
      .setDepth(1000);
    const sparks = sparkManager.createEmitter({
      follow: lightBall,
      tint: 0xfff642,
      scale: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      radial: true,
      speed: { onEmit: () => 200 * getZoomModifier() },
      lifespan: 500,
    });
    const getHexColor = () =>
      Color.ObjectToColor(
        Color.Interpolate.ColorWithColor(
          Color.IntegerToColor(0xffe51c),
          Color.IntegerToColor(0x31ff1f),
          1,
          getCharge(),
        ),
      ).color;
    const hexes = hexManager.createEmitter({
      follow: lightBall,
      scale: { end: 0, onEmit: () => 0.75 * getZoomModifier() },
      lifespan: 500,
      frequency: 50,
      rotate: {
        onEmit: () => Phaser.Math.Angle.RandomDegrees(),
        onUpdate: (p, k, t, v) => v + 10,
      },
      tint: {
        onEmit: getHexColor,
      },
      alpha: {
        start: 0.5,
        end: 0,
      },
    });
    let ballSpeed: Vector2;
    const sparkControl = {
      t: 0,
    };

    const globalState = Flow.makeSceneStates();
    const lifeState = Flow.makeSceneStates();

    const living: Flow.PhaserNode = Flow.sequence(
      Flow.tween({
        targets: lightBall,
        props: { scale },
      }),
      Flow.repeatSequence(
        Flow.tween(() => ({
          targets: lightBall,
          props: { scale: 0.8 * getResolvedScale() },
          duration: 200,
          ease: Phaser.Math.Easing.Cubic.Out,
        })),
        Flow.tween(() => ({
          targets: lightBall,
          props: { scale: getResolvedScale() },
          duration: 200,
          ease: Phaser.Math.Easing.Cubic.Out,
        })),
      ),
    );

    const destroy: Flow.PhaserNode = Flow.sequence(
      Flow.call(() => {
        lightBall.setVelocity(0, 0);
        lightBall.disableBody();
        hexes.stop();
        sparks.stop();
        hexManager
          .createEmitter({
            scale: { start: 0.1, end: 0.5 },
            alpha: { start: 1, end: 0 },
            lifespan: 700,
            frequency: -1,
            tint: { onEmit: getHexColor },
            emitZone: {
              type: "random",
              source: {
                getRandomPoint: (point) => {
                  const r = ((lightBall.width * getResolvedScale()) / 2) * 3;
                  Phaser.Math.RotateAroundDistance(
                    point,
                    0,
                    0,
                    Phaser.Math.RND.angle(),
                    Math.sqrt(Phaser.Math.RND.between(0, r ** 2)),
                  );
                },
              },
            },
          })
          .explode(20, lightBall.x, lightBall.y);
      }),
      Flow.parallel(
        Flow.tween({
          targets: lightBall,
          props: {
            scale: scale * 3,
            alpha: 0,
          },
          duration: 700,
        }),
      ),
      Flow.call(() => {
        lightBall.destroy();
        hexManager.destroy();
        sparkManager.destroy();
      }),
    );

    const dyingAndRestart: Flow.PhaserNode = Flow.sequence(
      destroy,
      Flow.waitTimer(2000),
      prepareGlurpAttack,
      globalState.completeFlow,
    );

    const dying: Flow.PhaserNode = Flow.sequence(
      destroy,
      globalState.completeFlow,
    );

    const launching: Flow.PhaserNode = Flow.parallel(
      Flow.whenValueDo({
        condition: finalSceneClass.events.destroyBall.subject,
        action: ({ respawn }) =>
          globalState.nextFlow(respawn ? dyingAndRestart : dying),
      }),
      Flow.onPostUpdate(
        () => () =>
          (sparks.followOffset = new Vector2(
            (lightBall.width / 2) * scale,
            0,
          ).rotate(sparkControl.t * Math.PI * 2)),
      ),
      Flow.tween({
        targets: sparkControl,
        props: { t: 1 },
        repeat: -1,
        duration: 300,
      }),
      Flow.sequence(
        Flow.call(() => {
          womanObj.play("slash-end");
          finalSceneClass.data.lightBalls.value(scene).add(lightBall);
          lightBall.setVelocity(ballSpeed.x, ballSpeed.y);
        }),
        Flow.waitTimer(3000),
        globalState.nextFlow(dyingAndRestart),
      ),
    );

    const preparing: Flow.PhaserNode = Flow.whenValueDo({
      condition: commonInputEvents.pointerdown.subject,
      action: (e) =>
        Flow.call(() => {
          ballSpeed = getObjectPosition(e.pointer)
            .subtract(getObjectPosition(lightBall))
            .normalize()
            .scale(500);
          finalSceneClass.data.lightBallReady.setValue(null)(scene);
          lifeState.next(launching);
        }),
    });

    return globalState.start(Flow.parallel(living, lifeState.start(preparing)));
  }),
);

export const finalWomanFlow: Flow.PhaserNode = Flow.lazy(
  (scene: Phaser.Scene) => {
    const playerY = 720;
    const player = createSpriteAt(
      scene,
      new Vector2(-20, playerY),
      "dungeon-player",
    );
    scene.anims.createFromAseprite("dungeon-player");
    setUpAnimDurations(scene, "slash-ready", [300, 50]);
    setUpAnimDurations(scene, "slash-end", [50, 50, 300]);
    woman.create(player);
    player.setScale(2);
    finalSceneClass.data.lightBallReady.setValue(null)(scene);

    player.anims.play({ key: "walk", repeat: -1 });
    return Flow.parallel(
      Flow.whenValueDo({
        condition: finalSceneClass.events.ghostAppear.subject,
        action: () => ghostFlow,
      }),
      Flow.sequence(
        Flow.moveTo({
          target: player,
          dest: new Vector2(867, playerY),
          speed: 200,
        }),
        Flow.moveTo({
          target: player,
          dest: new Vector2(993, 600),
          speed: 200,
        }),
        Flow.call(() => {
          player.anims.stop();
          player.play("idle");
        }),
        Flow.waitTimer(1000),
        Flow.call(() => {
          player.play("kneel");
        }),
        Flow.waitTimer(4000),
        Flow.call(finalSceneClass.events.enterKidra.emit({})),
        Flow.waitTimer(3000),
        Flow.call(() => {
          player.play("idle");
        }),
      ),
      Flow.whenValueDo({
        condition: finalSceneClass.events.enterKidraDone.subject,
        action: () => jumpOntoGlurp,
      }),
      Flow.whenValueDo({
        condition: finalSceneClass.events.kidraDead.subject,
        action: () => Flow.call(() => player.play("idle")),
      }),
      lightBallReady,
    );
  },
);
