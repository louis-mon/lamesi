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
import { uiBuilder } from "/src/helpers/ui/ui-builder";
import { menuSceneKey } from "/src/scenes/common/constants";

export const cheatCodeAction: Flow.PhaserNode = Flow.lazy((scene) => {
  if (!otherGlobalData.cheatCodes.value(scene)) return Flow.noop;

  const ui = uiBuilder(scene);
  const toast = scene.rexUI.add.toast({
    anchor: { right: "90%", bottom: "90%" },
    background: ui.containerBack(),
    text: ui.bodyText(""),
    space: ui.borderSpacing(3),
  });

  const activateAllKey = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.PLUS,
  );
  return Flow.observe(fromEvent(activateAllKey, "down"), () =>
    Flow.call(() => {
      const activated = (Object.keys(eventsDef) as GlobalDataKey[]).filter(
        (key) => globalData[key].value(scene) && !isEventSolved(key)(scene),
      );
      activated.forEach((key) => {
        solveEvent(key)(scene);
        toast.showMessage(`Activated '${key}'`);
      });
    }),
  );
});
