import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { newEventAnimStartPosition } from "/src/scenes/menu/new-event-anim";
import { createImageAt } from "/src/helpers/phaser";
import { isEventSolved, solveEvent } from "/src/scenes/common/events-def";
import { commonGoEvents } from "/src/helpers/component";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import i18next from "i18next";
import { languages, languageSvgKey } from "/src/i18n/i18n";
import { getProp } from "/src/helpers/functional";
import { otherGlobalData } from "/src/scenes/common/global-data";

const startHub: Flow.PhaserNode = Flow.lazy((scene) => {
  const light = scene.add.pointlight(
    newEventAnimStartPosition.x,
    newEventAnimStartPosition.y,
    0xffffff,
    250,
    0,
  );
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

const prepareHub = (scene: Phaser.Scene) => {
  const orb = createImageAt(
    scene,
    newEventAnimStartPosition,
    "central-orb",
  ).setName("orb");
  orb.setInteractive();
};

const clickOnOrb: Flow.PhaserNode = Flow.lazy((scene) => {
  prepareHub(scene);
  return Flow.whenValueDo({
    condition: commonGoEvents.pointerdown("orb").subject,
    action() {
      solveEvent("firstEvent")(scene);
      return startHub;
    },
  });
});

export const hubIntro: Flow.PhaserNode = Flow.lazy((scene) => {
  if (isEventSolved("firstEvent")(scene)) {
    prepareHub(scene);
    return startHub;
  }
  const nbLanguages = i18next.languages.length;
  const flags = languages.map((lang, i) => {
    return {
      lang,
      obj: scene.add
        .image(
          gameWidth / 2 + (-(nbLanguages - 1) / 2 + i) * 300,
          (gameHeight / 3) * 2,
          languageSvgKey(lang),
        )
        .setOrigin(0.5, 0.5)
        .setInteractive(),
    };
  });
  const title = scene.add
    .text(gameWidth / 2, gameHeight / 3, "LAMESI", { fontSize: "150px" })
    .setOrigin(0.5, 0.5);
  return Flow.waitOnOfPointerdown({
    items: flags,
    getObj: getProp("obj"),
    nextFlow: (flag) => {
      otherGlobalData.language.setValue(flag.lang)(scene);
      return Flow.sequence(
        Flow.parallel(
          Flow.tween({
            targets: (
              flags.filter((f) => f !== flag).map(getProp("obj")) as unknown[]
            ).concat(title),
            props: { alpha: 0 },
            duration: 1500,
          }),
          Flow.tween({
            targets: flag.obj,
            props: { scale: 2, alpha: 0 },
            duration: 1500,
          }),
        ),
        clickOnOrb,
      );
    },
  });
});
