import * as Flow from "/src/helpers/phaser-flow";
import { isEventSolved } from "/src/scenes/common/event-dependencies";
import { createTree } from "/src/scenes/creatures/tree";
import { gameHeight } from "/src/scenes/common/constants";
import Vector2 = Phaser.Math.Vector2;
import { vecToXY } from "/src/helpers/phaser";
import { globalEvents } from "/src/scenes/common/global-events";

export const goal1: Flow.PhaserNode = Flow.lazy((scene) => {
  const isSolved = isEventSolved("creatures1")(scene);

  const closedBook = scene.add.image(962, -50, "items", "book");
  const openBook = scene.add
    .image(closedBook.x, 842, "crea-npc", "open-book")
    .setVisible(false);
  const manDeskPos = new Vector2(960, 890);
  const man = scene.add.image(manDeskPos.x, gameHeight + 40, "crea-npc", "man");

  const realTime = (ms: number) => (isSolved ? 0 : ms);

  const goToCreateTree = Flow.sequence(
    Flow.call(() => {
      man.flipX = true;
    }),
    Flow.tween({ targets: man, props: { x: 1540, y: 992 }, duration: 2000 }),
    Flow.waitTimer(600),
    Flow.parallel(
      createTree,
      Flow.sequence(
        Flow.waitTimer(600),
        Flow.call(() => {
          man.flipX = false;
        }),
        Flow.tween({
          targets: man,
          props: vecToXY(manDeskPos),
          duration: 2000,
        }),
      ),
    ),
  );
  return Flow.sequence(
    isSolved ? Flow.noop : Flow.wait(globalEvents.subSceneEntered.subject),
    Flow.tween({
      targets: closedBook,
      props: { y: openBook.y },
      duration: realTime(3000),
    }),
    Flow.tween({
      targets: man,
      props: { y: manDeskPos.y },
      duration: realTime(2000),
    }),
    Flow.waitTimer(realTime(600)),
    Flow.call(() => {
      closedBook.destroy();
      openBook.setVisible(true);
    }),
    Flow.waitTimer(realTime(1000)),
    isSolved ? createTree : goToCreateTree,
  );
});
