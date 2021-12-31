import * as Flow from "/src/helpers/phaser-flow";
import {
  globalData,
  GlobalDataKey,
  otherGlobalData,
} from "/src/scenes/common/global-data";
import Phaser from "phaser";
import { fromEvent } from "rxjs";
import {
  eventsDef,
  isEventSolved,
  solveEvent,
} from "/src/scenes/common/events-def";

export const cheatCodeAction: Flow.PhaserNode = Flow.whenTrueDo({
  condition: otherGlobalData.cheatCodes.dataSubject,
  action: Flow.lazy((scene) => {
    const activateAllKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.PLUS,
    );
    return Flow.observe(fromEvent(activateAllKey, "down"), () =>
      Flow.call(() => {
        const activated = (Object.keys(eventsDef) as GlobalDataKey[]).filter(
          (key) => globalData[key].value(scene) && !isEventSolved(key)(scene),
        );
        activated.forEach((key) => solveEvent(key)(scene));
      }),
    );
  }),
});
