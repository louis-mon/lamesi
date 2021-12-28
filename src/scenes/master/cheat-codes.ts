import * as Flow from "/src/helpers/phaser-flow";
import { globalData, GlobalDataKey } from "/src/scenes/common/global-data";
import Phaser from "phaser";
import { fromEvent } from "rxjs";
import {
  eventDependencies,
  isEventSolved,
  solveEvent,
} from "/src/scenes/common/event-dependencies";

export const cheatCodeAction: Flow.PhaserNode = Flow.whenTrueDo({
  condition: globalData.cheatCodes.dataSubject,
  action: Flow.lazy((scene) => {
    const activateAllKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.PLUS,
    );
    return Flow.observe(fromEvent(activateAllKey, "down"), () =>
      Flow.call(() => {
        const activated = (Object.keys(
          eventDependencies,
        ) as GlobalDataKey[]).filter(
          (key) => globalData[key].value(scene) && !isEventSolved(scene)(key),
        );
        activated.forEach((key) => solveEvent(key)(scene));
      }),
    );
  }),
});
