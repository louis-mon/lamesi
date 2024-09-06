import * as Flow from "/src/helpers/phaser-flow";
import * as Phaser from "phaser";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import WebGLRenderer = Phaser.Renderer.WebGL.WebGLRenderer;
import Vector2 = Phaser.Math.Vector2;
import { makeSceneStates } from "/src/helpers/phaser-flow";
import { finalDepths, finalSceneClass } from "/src/scenes/final/final-defs";
import { map } from "rxjs/operators";
import { getObjectPosition } from "/src/helpers/phaser";
import RadToDeg = Phaser.Math.RadToDeg;

export const ghostFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  class WavePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor() {
      super({
        game: scene.game,
        fragShader: `
            precision mediump float;
            
            uniform sampler2D uMainSampler;
            uniform float time;
            uniform vec2 screenRatio;
            
            varying vec2 outTexCoord;
            
            void main() {
                float d = 0.02*screenRatio.x;
                vec2 uv = outTexCoord;
                uv.x = uv.x+sin(time*3.0+uv.y * 40.0/screenRatio.y)*d;
                gl_FragColor = texture2D(uMainSampler, uv);
            }
        `,
      });
    }

    onPreRender() {
      this.set1f("time", this.game.loop.time / 1000);
    }
  }

  const initialPos = new Vector2(1044, 393);

  const man = scene.add
    .image(initialPos.x, initialPos.y, "crea-npc", "man1")
    .setAlpha(0)
    .setDepth(finalDepths.ghost)
    .setScale(2);
  (scene.renderer as WebGLRenderer).pipelines.remove("WaveShader");
  (scene.renderer as WebGLRenderer).pipelines.addPostPipeline(
    "WaveShader",
    WavePipeline,
  );
  man.setPostPipeline("WaveShader");
  (man.getPostPipeline(WavePipeline) as WavePipeline).set2f(
    "screenRatio",
    man.displayWidth / gameWidth,
    man.displayHeight / gameHeight,
  );
  const state = makeSceneStates();

  const sparkManager = scene.add
    .particles("fight", "light-particle")
    .setDepth(1000);

  const ascend = (): Flow.PhaserNode =>
    Flow.sequence(
      Flow.waitTimer(2000),
      Flow.moveTo({
        target: man,
        dest: new Vector2(927, 177),
        speed: 200,
      }),
      state.nextFlow(wait()),
    );

  const wait = (): Flow.PhaserNode =>
    Flow.lazy(() =>
      Flow.whenTrueDo({
        condition: finalSceneClass.data.lightBallReady
          .dataSubject(scene)
          .pipe(map((x) => !!x)),
        action: state.nextFlow(charge()),
      }),
    );

  const stopCharge = (): Flow.PhaserNode =>
    Flow.sequence(
      Flow.call(() =>
        sparkManager.emitters.each((e) => {
          e.setAlpha({ onUpdate: (particle, key, t, value) => value * 0.95 });
          e.stop();
        }),
      ),
      Flow.wait(finalSceneClass.data.lightBallReady.subject),
      state.nextFlow(wait()),
    );

  const charge = (): Flow.PhaserNode =>
    Flow.lazy(() =>
      Flow.parallel(
        Flow.whenTrueDo({
          condition: finalSceneClass.data.lightBallReady
            .dataSubject(scene)
            .pipe(map((x) => !x)),
          action: state.nextFlow(stopCharge()),
        }),
        Flow.sequence(
          Flow.call(() => {
            const lightBall =
              finalSceneClass.data.lightBallReady.value(scene)!.lightBall;
            const dirToBall = getObjectPosition(lightBall)
              .clone()
              .subtract(getObjectPosition(man));
            sparkManager.emitters.removeAll();
            const angleDelta = 35;
            const baseAngle = RadToDeg(dirToBall.angle());
            sparkManager.createEmitter({
              follow: man,
              tint: 0x31ff1f,
              radial: true,
              speed: 150,
              lifespan: 5000,
              angle: {
                min: baseAngle - angleDelta,
                max: baseAngle + angleDelta,
              },
              rotate: {
                onEmit: () => Phaser.Math.Angle.RandomDegrees(),
                onUpdate: (particle, key, t, value) => value + 10,
              },
            });
          }),
          Flow.tween({
            targets: { x: 0 },
            props: { x: 1 },
            onUpdate: (tween) =>
              finalSceneClass.data.lightBallCharge.setValue(
                tween.progress > 0.5 ? (tween.progress - 0.5) / 0.5 : 0,
              )(scene),
            duration: 7000,
          }),
          state.nextFlow(stopCharge()),
        ),
      ),
    );

  const returnToGrave: Flow.PhaserNode = Flow.whenValueDo({
    condition: finalSceneClass.events.kidraDead.subject,
    action: () =>
      Flow.sequence(
        Flow.moveTo({
          target: man,
          dest: initialPos,
          speed: 200,
        }),
        blinkState.nextFlow(Flow.noop),
        Flow.tween({
          targets: man,
          props: { alpha: 0 },
          duration: 8000,
        }),
        Flow.waitTimer(4000),
        Flow.call(finalSceneClass.events.runCredits.emit({})),
      ),
  });

  const updateParticles: Flow.PhaserNode = Flow.onPostUpdate(() => () => {
    const lightBall =
      finalSceneClass.data.lightBallReady.value(scene)?.lightBall;
    sparkManager.emitters.each((e) => {
      if (!lightBall) {
        return;
      }
      e.forEachAlive((p) => {
        const pVel = new Vector2(p.velocityX, p.velocityY);
        const dirToBall = getObjectPosition(lightBall)
          .clone()
          .subtract(getObjectPosition(p));
        if (dirToBall.lengthSq() < 20 ** 2) {
          p.velocityY = 0;
          p.velocityX = 0;
          p.alpha = 0;
          return;
        }
        dirToBall.normalize().scale(pVel.length());
        pVel.setAngle(
          Phaser.Math.Angle.RotateTo(pVel.angle(), dirToBall.angle(), 0.008),
        );
        p.velocityX = pVel.x;
        p.velocityY = pVel.y;
      }, null);
    });
  });

  const blinkState = makeSceneStates();

  return Flow.parallel(
    state.start(),
    returnToGrave,
    updateParticles,
    Flow.sequence(
      Flow.tween({
        targets: man,
        props: { alpha: 0.8 },
      }),
      state.nextFlow(ascend()),
      blinkState.start(
        Flow.tween({
          targets: man,
          props: { alpha: 0.65 },
          yoyo: true,
          repeat: -1,
          ease: Phaser.Math.Easing.Sine.InOut,
          duration: 600,
        }),
      ),
    ),
  );
});
