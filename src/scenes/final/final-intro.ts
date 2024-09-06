import * as Flow from "/src/helpers/phaser-flow";
import { globalEvents } from "/src/scenes/common/global-events";
import { finalSceneClass } from "/src/scenes/final/final-defs";
import { creditsFlow } from "/src/scenes/final/credits-flow";
import { kidraFlow } from "/src/scenes/final/kidra";
import { finalWomanFlow } from "/src/scenes/final/final-woman-flow";
import { kidraMinionsFlow } from "/src/scenes/final/kidra-minions";
import { finalGlurpFlow } from "/src/scenes/final/final-glurp";

export const finalIntro: Flow.PhaserNode = Flow.sequence(
  Flow.wait(globalEvents.subSceneEntered.subject),
  Flow.parallel(
    Flow.whenValueDo({
      condition: finalSceneClass.events.enterKidra.subject,
      action: () => kidraFlow,
    }),
    kidraMinionsFlow,
    finalWomanFlow,
    finalGlurpFlow,
    Flow.whenValueDo({
      condition: finalSceneClass.events.runCredits.subject,
      action: () => creditsFlow({ canSkip: false }),
    }),
  ),
);
