import * as Phaser from "phaser";
import { MenuScene } from "../menu/menu-scene";
import * as Flow from "/src/helpers/phaser-flow";
import { subSceneFlow } from "/src/scenes/hub/sub-scenes";
import { hubSceneKey, menuSceneKey } from "/src/scenes/common/constants";
import { hubIntro } from "/src/scenes/hub/hub-intro";
import { languages, languageSvgKey } from "/src/i18n/i18n";

export class HubScene extends Phaser.Scene {
  constructor() {
    super({
      key: hubSceneKey,
      loader: {
        path: "assets/common",
      },
    });
  }

  preload() {
    this.load.atlas("items");
    this.load.image("hub-back");
    this.load.image("central-orb");
    this.load.image("frame");
    languages.forEach((lang) =>
      this.load.svg(languageSvgKey(lang), `flags/${lang}.svg`, {
        width: 200,
        height: 150,
      }),
    );
  }

  create() {
    this.add.image(0, 0, "hub-back").setOrigin(0, 0);
    Flow.runScene(this, Flow.parallel(hubIntro, subSceneFlow));
    this.scene.add(menuSceneKey, new MenuScene(), true, {
      currentScene: this,
    });
  }
}
