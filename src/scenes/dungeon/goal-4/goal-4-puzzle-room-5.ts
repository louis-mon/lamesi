import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "../definitions";
import { hintFlameRoom5, playerIsOnFlame } from "./goal-4-defs";

const greenFlame = hintFlameRoom5;

const puzzleFlow: Flow.PhaserNode = Flow.sequence(
  Flow.waitTrue(playerIsOnFlame(greenFlame.instance)),
  Flow.tween((scene) => ({
    targets: greenFlame.instance.getObj(scene),
    props: { scale: 0 },
  })),
  Flow.call(Def.scene.events.showAltSwitchInRoom5.emit({})),
);

export const goal4PuzzleRoom5Config = {
  instance: greenFlame,
  flow: puzzleFlow,
};
