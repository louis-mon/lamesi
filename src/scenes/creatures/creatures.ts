import * as Flow from "/src/helpers/phaser-flow";
import { createTree } from "./tree";
import { createCentralCreature } from "./central";
import { createPot } from "./pot";
import { createRocks } from "/src/scenes/creatures/rocks";
import { legsFlow } from "/src/scenes/creatures/legs/legs";

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
  }

  create() {
    Flow.run(
      this,
      Flow.parallel(
        createTree,
        createPot,
        createRocks,
        createCentralCreature,
        legsFlow,
      ),
    );
  }
}
