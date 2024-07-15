import * as Flow from "/src/helpers/phaser-flow";
import {
  BodyPart,
  bodyPartsConfig,
  creatureSceneClass,
} from "/src/scenes/creatures/def";
import { getObjectPosition, placeAt, vecToXY } from "/src/helpers/phaser";
import { range } from "lodash";
import { getTargetTransform, transformMan } from "/src/scenes/creatures/man";
import {
  getEventDef,
  isEventReady,
  isEventSolved,
  solveEvent,
} from "/src/scenes/common/events-def";
import Vector2 = Phaser.Math.Vector2;
import { globalEvents } from "/src/scenes/common/global-events";
import { cutscene } from "/src/scenes/common/cutscene";

const waveFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  const creature = creatureSceneClass.data.glurpObj.value(scene);
  const man = creatureSceneClass.data.manObj.value(scene);
  const wave = scene.add
    .image(creature.x, creature.y, "crea-npc", "light-ring")
    .setScale(0);
  return Flow.parallel(
    Flow.tween({
      targets: wave,
      props: { scale: 1 },
      duration: 400,
      ease: Phaser.Math.Easing.Sine.In,
    }),
    Flow.sequence(
      Flow.tween({
        targets: wave,
        props: vecToXY(getObjectPosition(man)),
        duration: 1500,
        ease: Phaser.Math.Easing.Sine.InOut,
      }),
      Flow.tween({
        targets: wave,
        props: { scale: 0 },
        duration: 400,
        ease: Phaser.Math.Easing.Sine.Out,
      }),
    ),
  );
});

export const solveCreatureEvent: (part: BodyPart) => Flow.PhaserNode = (part) =>
  Flow.lazy((scene) => {
    const bodyDef = bodyPartsConfig[part];
    const dataSolved = bodyDef.requiredEvent;
    const prevTransform = getTargetTransform(scene);
    solveEvent(dataSolved)(scene);
    const newTransform = getTargetTransform(scene);
    if (prevTransform === newTransform) {
      if (
        Object.values(bodyPartsConfig).some(
          (otherPart) =>
            isEventReady(otherPart.requiredEvent)(scene) &&
            !isEventSolved(otherPart.requiredEvent)(scene),
        )
      ) {
        return Flow.noop;
      } else {
        return Flow.call(globalEvents.goToHub.emit({}));
      }
    }

    const man = creatureSceneClass.data.manObj.value(scene);
    const bubble = placeAt(
      scene.add.image(0, 0, "crea-npc", "thought"),
      man.getTopRight().add(new Vector2(-16, 10)),
    )
      .setScale(0)
      .setOrigin(0, 1);
    const showKeyItem: Flow.PhaserNode = Flow.lazy(() => {
      const keyItem = getEventDef(dataSolved)
        .createItem({
          pos: bubble.getTopLeft().add(new Vector2(58, 45)),
          scene,
        })
        .setAlpha(0);

      return Flow.tween({
        targets: keyItem,
        props: { alpha: 1 },
        duration: 1600,
      });
    });

    return cutscene(
      Flow.sequence(
        Flow.waitTimer(2000),
        Flow.parallel(
          ...range(25).map((i) =>
            Flow.sequence(Flow.waitTimer(100 * i), waveFlow),
          ),
        ),
        transformMan,
        Flow.tween({
          targets: bubble,
          props: { scale: 1 },
        }),
        showKeyItem,
        Flow.waitTimer(1800),
        Flow.call(
          globalEvents.endEventAnim.emit({
            dataSolved,
          }),
        ),
      ),
    );
  });
