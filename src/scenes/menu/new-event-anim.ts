import * as Flow from "/src/helpers/phaser-flow";
import { globalData, GlobalDataKey } from "/src/scenes/common/global-data";
import {
  allEvents,
  findPreviousEvent,
  getEventDef,
  isEventSolved,
} from "/src/scenes/common/events-def";
import { moveTo } from "/src/helpers/animate/move";
import { centerOfSubScene, isASubScene } from "/src/scenes/hub/sub-scenes";
import { waitTimer } from "/src/helpers/phaser-flow";
import { fadeDuration } from "/src/scenes/menu/menu-scene-def";
import { globalEvents } from "/src/scenes/common/global-events";

export const newEventAnim: Flow.PhaserNode = Flow.lazy((scene) => {
  const unsolvedEvents = allEvents.filter(
    (key) => globalData[key].value(scene) && !isEventSolved(key)(scene),
  );
  const itemAnim = (targetKey: GlobalDataKey): Flow.PhaserNode => {
    const targetDef = getEventDef(targetKey);
    if (!isASubScene(targetDef.scene)) return Flow.noop;
    const sourceItem = getEventDef(findPreviousEvent(targetKey)).keyItem;
    if (!sourceItem) return Flow.noop;
    const keyItem = scene.add
      .image(952, 896, "items", sourceItem)
      .setAlpha(0)
      .setScale(1.5);

    return Flow.sequence(
      Flow.tween({
        targets: keyItem,
        props: { alpha: 1 },
        duration: 800,
      }),
      moveTo({
        target: keyItem,
        dest: centerOfSubScene(targetDef.scene),
        speed: 0.3,
      }),
      Flow.tween({
        targets: keyItem,
        props: { alpha: 0, scale: 3 },
        duration: 2200,
      }),
      Flow.call(globalEvents.subSceneHint.emit({ sceneKey: targetDef.scene })),
    );
  };

  return Flow.sequence(
    waitTimer(fadeDuration * 2),
    ...unsolvedEvents.map(itemAnim),
  );
});
