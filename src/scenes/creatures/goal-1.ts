import * as Flow from "/src/helpers/phaser-flow";
import { isEventSolved } from "/src/scenes/common/event-dependencies";
import { createTree } from "/src/scenes/creatures/tree";
import { gameHeight } from "/src/scenes/common/constants";
import Vector2 = Phaser.Math.Vector2;
import { vecToXY } from "/src/helpers/phaser";
import { globalEvents } from "/src/scenes/common/global-events";
import { moveTo } from "/src/helpers/animate/move";
import { swingRotation } from "/src/helpers/animate/tween/swing-rotation";

export const goal1: Flow.PhaserNode = Flow.lazy((scene) => {
  const isSolved = isEventSolved("creatures1")(scene);

  const closedBook = scene.add.image(962, -50, "items", "book");
  const openBook = scene.add
    .image(closedBook.x, 842, "crea-npc", "open-book")
    .setVisible(false);
  const manDeskPos = new Vector2(960, 890);
  const man = scene.add.image(manDeskPos.x, gameHeight + 40, "crea-npc", "man");
  const manSpeed = isSolved ? Number.MAX_SAFE_INTEGER : 0.2;
  const moveMan: (p: { dest: Vector2 }) => Flow.PhaserNode = ({ dest }) =>
    Flow.concurrent(
      Flow.repeat(
        swingRotation({
          duration: 100,
          target: man,
          ampl: Math.PI / 12,
        }),
      ),
      moveTo({
        target: man,
        dest,
        speed: manSpeed,
      }),
    );

  const realTime = (ms: number) => (isSolved ? 0 : ms);

  const goToCreateTree = Flow.sequence(
    Flow.call(() => {
      man.flipX = true;
    }),
    moveMan({ dest: new Vector2(1540, 992) }),
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
    moveMan({
      dest: new Vector2({ x: man.x, y: manDeskPos.y }),
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
