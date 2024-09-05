import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { ManipulableObject, getObjectPosition } from "/src/helpers/phaser";
import {
  sceneDef,
  LightSceneMaterialDef,
  ObjectCreationDef,
  sourcesPlane,
  sceneClass,
  muralsPlane,
} from "./lights-def";
import { menuHelpers } from "/src/scenes/menu/menu-scene-def";
import { createMaterial } from "/src/scenes/lights/materials";
import { createGoal } from "/src/scenes/lights/goals";
import { createLightSource } from "/src/scenes/lights/light-source";

export class LightScene extends Phaser.Scene {
  constructor() {
    super({
      key: "lights",
      loader: {
        path: "assets/lights",
      },
    });
  }

  preload() {
    this.load.image("goal-1");
    this.load.image("goal-2");
    this.load.image("goal-3");
    this.load.image("goal-4");
    this.load.image("goal-5");
    this.load.atlas("materials");
    this.load.image("murals");
  }

  public shadows: Array<{
    source: ManipulableObject;
    material: ManipulableObject;
    shadow: ManipulableObject;
    def: LightSceneMaterialDef;
  }> = [];
  setCommonProps = (go: ManipulableObject, def: ObjectCreationDef) => {
    go.name = def.key;
    if (def.movable) {
      go.setInteractive();
      this.input.setDraggable(go);
      go.on("drag", (p, x, y) => {
        go.x = x;
        go.y = y;
        menuHelpers.ensureOutsideMenu(go);
      });
    }
  };

  create() {
    this.add.image(0, 0, "murals").setOrigin(0, 0).setDepth(muralsPlane);
    sceneClass.data.hiddenZoomTracks.setValue(0)(this);
    Flow.runScene(
      this,
      Flow.parallel(
        ...sceneDef.lights.map(createLightSource),
        ...sceneDef.materials.map(createMaterial),
        ...sceneDef.goals.map(createGoal),
      ),
    );
  }

  update() {
    this.shadows.forEach(({ source, shadow, material, def }) => {
      const sourcePos = getObjectPosition(source);
      const scale = material.scale;
      const { x, y } = getObjectPosition(material)
        .clone()
        .subtract(sourcePos)
        .scale(scale)
        .add(sourcePos);
      shadow.setPosition(x, y);
      shadow.setScale(scale * scale);
    });
  }
}
