import * as Flow from "/src/helpers/phaser-flow";
import {
  findPreviousEvent,
  isEventSolved,
} from "/src/scenes/common/events-def";
import { createTree } from "/src/scenes/creatures/tree";
import { gameHeight } from "/src/scenes/common/constants";
import Vector2 = Phaser.Math.Vector2;
import { globalEvents } from "/src/scenes/common/global-events";
import { bodyPartsConfig, creatureSceneClass } from "/src/scenes/creatures/def";
import {
  getTargetTransform,
  manDeskPos,
  moveMan,
} from "/src/scenes/creatures/man";
import { createKeyItem } from "/src/scenes/common/key-item";
import { getObjectPosition, placeAt } from "/src/helpers/phaser";
import { cutscene } from "/src/scenes/common/cutscene";

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
  const man = scene.add
    .image(manDeskPos.x, gameHeight + 40, "crea-npc", "man1")
    .setScale(1.6);
  creatureSceneClass.data.manObj.setValue(man)(scene);
  const manStep = getTargetTransform(scene);
  if (manStep) {
    man.setFrame(manStep.frameKey);
  }
  const realTime = (ms: number) => (isSolved ? 0 : ms);

  const goToCreateTree = Flow.sequence(
    cutscene(
      Flow.sequence(
        Flow.call(() => {
          man.flipX = true;
        }),
        moveMan({ dest: new Vector2(1540, 992) }),
        Flow.waitTimer(600),
      ),
    ),
    Flow.parallel(
      createTree,
      Flow.sequence(
        Flow.waitTimer(600),
        Flow.call(() => {
          man.flipX = false;
        }),
        moveMan({
          dest: manDeskPos,
        }),
      ),
    ),
  );
  const manDest = new Vector2({ x: man.x, y: manDeskPos.y });
  return Flow.sequence(
    isSolved
      ? Flow.noop
      : Flow.sequence(
          Flow.wait(globalEvents.subSceneEntered.subject),
          cutscene(
            Flow.sequence(
              closedBook.downAnim(getObjectPosition(openBook)),
              moveMan({
                dest: manDest,
              }),
              Flow.waitTimer(realTime(600)),
            ),
          ),
        ),
    Flow.call(() => {
      placeAt(man, manDest);
      closedBook.obj.destroy();
      openBook.setVisible(true);
    }),
    Flow.waitTimer(realTime(1000)),
    isSolved ? createTree : goToCreateTree,
  );
});
