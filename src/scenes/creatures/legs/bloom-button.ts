import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Flow from "/src/helpers/phaser-flow";
import { createImageAt, getObjectPosition } from "/src/helpers/phaser";
import {
  commonGoEvents,
  customEvent,
  declareGoInstance,
  defineGoImage,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import _, { keys, pickBy, sortBy, uniq } from "lodash";
import * as Def from "../def";
import { thornFlow } from "/src/scenes/creatures/legs/thorns";
import { legFlow, LegFlowParams } from "/src/scenes/creatures/legs/legs-leg";

export const legsBloomClass = defineGoImage({
  events: {
    attachThorn: customEvent(),
  },
  data: {},
});

type LegsConfig = {
  budsDependency: Record<string, string[]>;
};

export const createBloomButtonFactory = ({ budsDependency }: LegsConfig) => ({
  pos,
  id,
  linkedLeg,
}: {
  pos: Vector2;
  id: string;
  linkedLeg?: Omit<LegFlowParams, "startPos">;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const budObj = createImageAt(scene, pos, "legs", "leaf-bud")
      .setDepth(Def.depths.legs.bud)
      .setScale(0.1);
    const shellObj = createImageAt(scene, pos, "legs", "leaf-bud-shell")
      .setDepth(Def.depths.legs.shell)
      .setInteractive();

    const instance = declareGoInstance(legsBloomClass, id);
    instance.create(shellObj);

    const targetIds = keys(pickBy(budsDependency, (l) => l.includes(id)));

    const state = Flow.makeSceneStates();
    let linkedThorns = 0;

    const RLeaves = shellObj.displayWidth * 0.7;
    const nbLeavesOnRay = 6;
    const nbLeaveRays = 5;
    const totalAngleLeaves = Math.PI * 6;
    const a = RLeaves / 5;
    const b = Math.pow(RLeaves / a, 1 / totalAngleLeaves);
    const leavesContainer = scene.add
      .container(pos.x, pos.y)
      .setDepth(Def.depths.legs.petal);
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

    const startState = Flow.observe(instance.events.attachThorn.subject, () => {
      ++linkedThorns;
      if (linkedThorns < budsDependency[id]?.length ?? 0) return Flow.noop;
      return Flow.sequence(
        Flow.tween({
          targets: budObj,
          props: { scale: 0.7 },
          duration: 300,
          ease: Phaser.Math.Easing.Sine.InOut,
        }),
        Flow.parallel(
          Flow.observe(commonGoEvents.pointerdown(id).subject, () =>
            state.nextFlow(bloomState),
          ),
          Flow.tween({
            targets: budObj,
            props: { scale: 0.4 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: Phaser.Math.Easing.Sine.InOut,
          }),
        ),
      );
    });

    const bloomState = Flow.lazy(() =>
      Flow.sequence(
        Flow.tween({
          targets: budObj,
          props: { scale: 0.25 },
          duration: 500,
          ease: Phaser.Math.Easing.Sine.InOut,
        }),
        openLeaves,
        Flow.parallel(
          Flow.repeat(pulseLeaves),
          linkedLeg ? legFlow({ startPos: pos, ...linkedLeg }) : Flow.noop,
          ...targetIds.map((targetId) =>
            Flow.lazy(() => {
              return thornFlow({
                startPos: pos,
                endPos: getObjectPosition(
                  legsBloomClass.getObj(targetId)(scene),
                ),
                afterReach: Flow.call(
                  legsBloomClass.events.attachThorn(targetId).emit({}),
                ),
              });
            }),
          ),
        ),
      ),
    );

    return state.start(startState);
  });
