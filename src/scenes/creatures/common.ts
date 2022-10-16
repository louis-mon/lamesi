import { GoInstance } from "/src/helpers/component";
import { followPosition } from "/src/helpers/animate/composite";
import { movableElementClass } from "/src/scenes/creatures/def";
import * as Flow from "/src/helpers/phaser-flow";
import { toWorldPos } from "/src/helpers/math/transforms";

export const moveFromCommand = (
  inst: GoInstance<typeof movableElementClass>,
): Flow.PhaserNode =>
  Flow.parallel(
    Flow.call((scene) => {
      const move = inst.data.move.value(scene);
      if (move.container) {
        const obj = inst.getObj(scene);
        obj.setRotation(obj.rotation + move.container.rotation);
      }
    }),
    followPosition({
      getPos: (scene) => {
        const move = inst.data.move.value(scene);
        return move.container
          ? toWorldPos(move.container, move.pos())
          : move.pos();
      },
      target: (scene) => inst.getObj(scene),
    }),
  );
