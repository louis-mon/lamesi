import * as Flow from "/src/helpers/phaser-flow";
import { globalData, GlobalDataKey } from "/src/scenes/common/global-data";
import {
  allEvents,
  findPreviousEvent,
  getEventDef,
  isEventSolved,
  undefinedEventItem,
} from "/src/scenes/common/events-def";
import { moveTo } from "/src/helpers/animate/move";
import { centerOfSubScene, isASubScene } from "/src/scenes/hub/sub-scenes";
import { waitTimer } from "/src/helpers/phaser-flow";
import { fadeDuration } from "/src/scenes/menu/menu-scene-def";
import { globalEvents } from "/src/scenes/common/global-events";
import Vector2 = Phaser.Math.Vector2;

export const newEventAnimStartPosition = new Vector2(952, 896);

export const newEventAnim: Flow.PhaserNode = Flow.lazy((scene) => {
  const itemAnim = (targetKey: GlobalDataKey): Flow.PhaserNode => {
    if (isEventSolved(targetKey)(scene)) return Flow.noop;
    const targetDef = getEventDef(targetKey);
    if (!isASubScene(targetDef.scene)) return Flow.noop;
    const sourceItem = getEventDef(findPreviousEvent(targetKey)).createItem;
    if (sourceItem === undefinedEventItem) return Flow.noop;
    const keyItem = sourceItem({ pos: newEventAnimStartPosition, scene })
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
        speed: 300,
      }),
      Flow.tween({
        targets: keyItem,
        props: { alpha: 0, scale: 3 },
        duration: 2200,
      }),
      Flow.call(globalEvents.subSceneHint.emit({ sceneKey: targetDef.scene })),
    );
  };

  return Flow.parallel(
    waitTimer(fadeDuration * 2),
    ...allEvents.map((key) =>
      Flow.whenTrueDo({
        condition: globalData[key].dataSubject(scene),
        action: Flow.lazy(() => itemAnim(key)),
      }),
    ),
  );
});
