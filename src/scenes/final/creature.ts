import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { createCentralCreature } from "/src/scenes/creatures/central";

export const creature: Flow.PhaserNode = Flow.lazy(() => createCentralCreature);
