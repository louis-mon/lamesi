import { GoInstance } from "/src/helpers/component";
import { followPosition } from "/src/helpers/animate/composite";
import { movableElementClass } from "/src/scenes/creatures/def";
import * as Flow from "/src/helpers/phaser-flow";
import { toWorldPos } from "/src/helpers/math/transforms";

export const moveFromCommand = (
  inst: GoInstance<typeof movableElementClass>,
): Flow.PhaserNode =>
  followPosition({
    getPos: (scene) => {
      const move = inst.data.move.value(scene);
      return move.container
        ? toWorldPos(move.container, move.pos())
        : move.pos();
    },
    target: (scene) => inst.getObj(scene),
  });
