import * as Flow from "/src/helpers/phaser-flow";
import {
  findPreviousEvent,
  isEventSolved,
} from "/src/scenes/common/events-def";
import { createTree } from "/src/scenes/creatures/tree";
import { gameHeight } from "/src/scenes/common/constants";
import Vector2 = Phaser.Math.Vector2;
import { globalEvents } from "/src/scenes/common/global-events";
import { bodyPartsConfig, sceneClass } from "/src/scenes/creatures/def";
import { getTargetTransform, moveMan } from "/src/scenes/creatures/man";
import { createKeyItem } from "/src/scenes/common/key-item";
import { getObjectPosition } from "/src/helpers/phaser";

export const goal1: Flow.PhaserNode = Flow.lazy((scene) => {
  const eyeConfig = bodyPartsConfig.eye;
  const isSolved = isEventSolved(eyeConfig.requiredEvent)(scene);

  const closedBook = createKeyItem(
    findPreviousEvent(eyeConfig.requiredEvent),
    scene,
  );
  const openBook = scene.add
    .image(962, 935, "crea-npc", "open-book")
    .setVisible(false);
  const manDeskPos = new Vector2(960, 962);
  const man = scene.add
    .image(manDeskPos.x, gameHeight + 40, "crea-npc", "man1")
    .setScale(1.6);
  sceneClass.data.manObj.setValue(man)(scene);
  const manStep = getTargetTransform(scene);
  if (manStep) {
    man.setFrame(manStep.frameKey);
  }
  const realTime = (ms: number) => (isSolved ? 0 : ms);
  const teleport = isSolved;

  const goToCreateTree = Flow.sequence(
    Flow.call(() => {
      man.flipX = true;
    }),
    moveMan({ dest: new Vector2(1540, 992), teleport }),
    Flow.waitTimer(600),
    Flow.parallel(
      createTree,
      Flow.sequence(
        Flow.waitTimer(600),
        Flow.call(() => {
          man.flipX = false;
        }),
        moveMan({
          dest: manDeskPos,
          teleport,
        }),
      ),
    ),
  );
  return Flow.sequence(
    isSolved ? Flow.noop : Flow.wait(globalEvents.subSceneEntered.subject),
    closedBook.downAnim({ dest: getObjectPosition(openBook), teleport }),
    moveMan({
      dest: new Vector2({ x: man.x, y: manDeskPos.y }),
      teleport,
    }),
    Flow.waitTimer(realTime(600)),
    Flow.call(() => {
      closedBook.obj.destroy();
      openBook.setVisible(true);
    }),
    Flow.waitTimer(realTime(1000)),
    isSolved ? createTree : goToCreateTree,
  );
});
