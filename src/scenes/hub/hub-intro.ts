import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { newEventAnimStartPosition } from "/src/scenes/menu/new-event-anim";
import { createImageAt } from "/src/helpers/phaser";
import { isEventSolved, solveEvent } from "/src/scenes/common/events-def";
import { commonGoEvents } from "/src/helpers/component";

const lightKey = "light";

const finishIntro: Flow.PhaserNode = Flow.lazy((scene) => {
  const light = scene.children.getByName(
    lightKey,
  ) as Phaser.GameObjects.PointLight;
  light.setVisible(true);
  return Flow.parallel(
    Flow.sequence(
      Flow.tween({
        targets: light,
        props: { intensity: 0.3 },
        duration: 2000,
      }),
      Flow.tween({
        targets: light,
        props: { intensity: 1 },
        duration: 2000,
        repeat: -1,
        yoyo: true,
      }),
    ),
  );
});

export const hubIntro: Flow.PhaserNode = Flow.lazy((scene) => {
  scene.add
    .pointlight(
      newEventAnimStartPosition.x,
      newEventAnimStartPosition.y,
      0xffffff,
      250,
      0,
    )
    .setName(lightKey)
    .setVisible(false);
  const orb = createImageAt(
    scene,
    newEventAnimStartPosition,
    "central-orb",
  ).setName("orb");
  orb.setInteractive();
  if (isEventSolved("firstEvent")(scene)) {
    return finishIntro;
  } else {
    return Flow.whenValueDo({
      condition: commonGoEvents.pointerdown(orb.name).subject,
      action() {
        solveEvent("firstEvent")(scene);
        return finishIntro;
      },
    });
  }
});
