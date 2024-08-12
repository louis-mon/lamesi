import Phaser from "phaser";

import * as Flow from "/src/helpers/phaser-flow";
import { declareGoInstance } from "/src/helpers/component";
import * as Def from "../def";
import { swingRotation } from "/src/helpers/animate/tween/swing-rotation";
import { CreatureMoveCommand } from "../def";
import { moveFromCommand } from "/src/scenes/creatures/common";
import { finalSceneClass, woman } from "/src/scenes/final/final-defs";
import Vector2 = Phaser.Math.Vector2;
import { placeAt } from "/src/helpers/phaser";
import { range } from "lodash";

export const createAlgae = (moveCommand: CreatureMoveCommand) => {
  const instance = declareGoInstance(Def.movableElementClass, null);
  const mainFlow: Flow.PhaserNode = Flow.lazy((scene) => {
    const root = instance
      .create(scene.add.container())
      .setScale(0.3)
      .setDepth(Def.depths.rocks.algae)
      .setRotation(moveCommand.rotation());

    instance.data.move.setValue(moveCommand)(scene);

    const algaeList: Phaser.GameObjects.Image[] = [];
    const maxDepth = 6;

    const growAlgae = ({
      parent,
      depth,
      offset,
    }: {
      parent: Phaser.GameObjects.Container;
      depth: number;
      offset: number;
    }): Flow.PhaserNode =>
      Flow.lazy(() => {
        if (depth > maxDepth) return Flow.noop;
        const ampl = Math.PI / 6 / Math.pow(1.1, depth);
        const subAlgae = scene.add
          .image(0, 0, "rocks", "algae")
          .setOrigin(0, 0.5)
          .setScale(0);
        algaeList.push(subAlgae);
        const subContainer = scene.add.container(offset, 0).setScale(1.2);
        parent.addAt(subContainer, 0);
        subContainer.add(subAlgae);

        return Flow.sequence(
          Flow.tween({
            targets: subAlgae,
            props: { scale: 1 },
            duration: 350,
          }),
          Flow.parallel(
            growAlgae({
              parent: subContainer,
              depth: depth + 1,
              offset: subAlgae.width - 10,
            }),
            Flow.repeatSequence(
              Flow.tween({
                targets: subAlgae,
                props: { scaleY: 0.72 },
                duration: 280,
                repeat: 1,
                yoyo: true,
              }),
              Flow.waitTimer(820),
            ),
            Flow.repeat(
              swingRotation({ duration: 2300, ampl, target: subContainer }),
            ),
          ),
        );
      });

    const lightBall = Flow.observe(
      finalSceneClass.events.prepareGlurpAttack.subject,
      () =>
        Flow.lazy(() => {
          const attack = finalSceneClass.data.attack.value(scene);
          const source = scene.add.container();
          attack.particles.createEmitter({
            follow: source,
            tint: 0xfff642,
            scale: { start: 1, end: 0 },
            rotate: { start: 0, end: 360 },
          });
          const track = {
            t: 1,
            i: maxDepth,
          };
          const emitterSpeed = 200;
          return Flow.sequence(
            Flow.withBackground({
              main: Flow.sequence(
                ...range(maxDepth + 1).map((i) =>
                  Flow.sequence(
                    Flow.tween({
                      targets: track,
                      props: { t: 0 },
                      duration: algaeList[i].width / (emitterSpeed / 1000),
                    }),
                    Flow.call(() => {
                      track.t = 1;
                      --track.i;
                    }),
                  ),
                ),
              ),
              back: Flow.onPostUpdate(() => () => {
                const algae = algaeList[track.i];
                const startPoint = new Vector2();
                algae
                  .getWorldTransformMatrix()
                  .transformPoint(algae.width * track.t, 0, startPoint);
                placeAt(source, startPoint);
              }),
            }),
            Flow.moveTo({
              target: source,
              dest: woman.getObj(scene).getTopLeft().add(new Vector2(9, 9)),
              speed: emitterSpeed,
            }),
            Flow.call(
              finalSceneClass.data.nbLightReady.updateValue((x) => x + 1),
            ),
          );
        }),
    );

    return Flow.parallel(
      lightBall,
      moveFromCommand(instance),
      growAlgae({ parent: root, depth: 0, offset: 0 }),
    );
  });
  return {
    instance,
    flow: mainFlow,
  };
};

export type AlgaeController = ReturnType<typeof createAlgae>;
