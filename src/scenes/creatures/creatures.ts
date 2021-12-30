import * as Flow from "/src/helpers/phaser-flow";
import { createCentralCreature } from "./central";
import { potFlow } from "./pot/pot";
import { rockFlow } from "/src/scenes/creatures/rocks";
import { legsFlow } from "/src/scenes/creatures/legs/legs";
import { backgroundFlow } from "/src/scenes/creatures/background";
import { goal1 } from "/src/scenes/creatures/goal-1";

export class CreaturesScene extends Phaser.Scene {
  constructor() {
    super({
      key: "creatures",
      loader: {
        path: "assets/creatures",
      },
    });
  }

  preload() {
    this.load.atlas("tree");
    this.load.atlas("central");
    this.load.atlas("pot");
    this.load.atlas("rocks");
    this.load.atlas("legs");
    this.load.atlas("crea-npc");
    this.load.image("back");
  }

  create() {
    Flow.runScene(
      this,
      Flow.parallel(
        backgroundFlow,
        goal1,
        potFlow,
        rockFlow,
        createCentralCreature,
        legsFlow,
      ),
    );
  }
}
