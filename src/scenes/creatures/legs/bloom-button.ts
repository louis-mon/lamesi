import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Flow from "/src/helpers/phaser-flow";
import { createImageAt } from "/src/helpers/phaser";
import {
  customEvent,
  declareGoInstance,
  defineGoImage,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import _ from "lodash";

export const legsBloomClass = defineGoImage({
  events: {
    openLeaves: customEvent(),
  },
  data: {},
});

export const createBloomButton = ({
  pos,
  id,
}: {
  pos: Vector2;
  id: string;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const buttonObj = createImageAt(scene, pos, "legs", "leaf-bud");
    const shell = createImageAt(scene, pos, "legs", "leaf-bud-shell");

    const RLeaves = buttonObj.displayWidth * 0.7;
    const nbLeavesOnRay = 6;
    const nbLeaveRays = 5;
    const totalAngleLeaves = Math.PI * 6;
    const a = RLeaves / 5;
    const b = Math.pow(RLeaves / a, 1 / totalAngleLeaves);
    const leavesContainer = scene.add.container(pos.x, pos.y);
    const leaves = _.flatMap(
      _.range(nbLeavesOnRay).map((i) => (i / nbLeavesOnRay) * totalAngleLeaves),
      (leaveAngle) =>
        _.range(nbLeaveRays).map((ray) => {
          const startRotation = (ray / nbLeaveRays) * Math.PI * 2;
          const offsetPos = new Vector2(0, 0)
            .setToPolar(leaveAngle, a * Math.pow(b, leaveAngle))
            .rotate(startRotation);
          const leave = createImageAt(
            scene,
            offsetPos,
            "legs",
            "leaf-bud-protection",
          )
            .setRotation(offsetPos.angle())
            .setScale(0)
            .setOrigin(0.2, 0.5);
          leavesContainer.add(leave);
          return leave;
        }),
    );
    leavesContainer.reverse();
    const instance = declareGoInstance(legsBloomClass, id);
    instance.create(buttonObj);

    const getLeave = (ray: number, posOnRay: number) =>
      leaves[posOnRay * nbLeaveRays + ray];

    const leafInitialScale = (posOnRay: number) =>
      0.3 * Math.pow(1.1, 1 + (posOnRay / nbLeavesOnRay) * 10);

    const openLeaves: Flow.PhaserNode = Flow.lazy(() => {
      return Flow.parallel(
        ..._.range(nbLeaveRays).map((ray) =>
          Flow.parallel(
            ..._.range(nbLeavesOnRay).map((posOnRay, i) =>
              Flow.tween({
                targets: getLeave(ray, posOnRay),
                props: { scale: leafInitialScale(posOnRay) },
                duration: 600,
                delay: i * 400,
                ease: Phaser.Math.Easing.Sine.Out,
              }),
            ),
          ),
        ),
      );
    });

    const pulseLeaves: Flow.PhaserNode = Flow.lazy(() => {
      const halfPulse = (subRange: number[], mapScale: (n: number) => number) =>
        Flow.parallel(
          ..._.range(nbLeaveRays).map((ray) =>
            Flow.parallel(
              ...subRange.map((posOnRay, i) =>
                Flow.tween({
                  targets: getLeave(ray, posOnRay),
                  props: { scaleX: mapScale(leafInitialScale(posOnRay)) },
                  duration: 800,
                  delay: i * 500,
                  ease: Phaser.Math.Easing.Sine.InOut,
                }),
              ),
            ),
          ),
        );
      return Flow.sequence(
        Flow.waitTimer(1230),
        halfPulse(_.range(nbLeavesOnRay), (scale) => scale / 2.5),
        Flow.waitTimer(600),
        halfPulse(_.range(nbLeavesOnRay).reverse(), _.identity),
      );
    });

    return Flow.sequence(
      Flow.wait(instance.events.openLeaves.subject),
      openLeaves,
      Flow.repeat(pulseLeaves),
    );
  });
