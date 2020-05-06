import * as Phaser from "phaser";
import { eventsHelpers } from "../global-events";

export class HubScene extends Phaser.Scene {
  constructor() {
    super({
      key: "hub"
    });
  }
  create() {
    eventsHelpers.startupEvents.forEach(ev => this.registry.toggle(ev));
    this.scene.launch("lights");
  }
}
