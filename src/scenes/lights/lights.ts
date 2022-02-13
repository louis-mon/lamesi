import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { ManipulableObject, getObjectPosition } from "/src/helpers/phaser";
import {
  sceneDef,
  LightSceneMaterialDef,
  ObjectCreationDef,
  sourcesPlane,
} from "./lights-def";
import { eventsHelpers } from "../common/global-data";
import { menuHelpers } from "/src/scenes/menu/menu-scene-def";
import { createMaterial } from "/src/scenes/lights/materials";
import { createGoal } from "/src/scenes/lights/goals";

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
  }

  public shadows: Array<{
    source: ManipulableObject;
    material: ManipulableObject;
    shadow: ManipulableObject;
    def: LightSceneMaterialDef;
  }> = [];
  setCommonProps = (go: ManipulableObject, def: ObjectCreationDef) => {
    go.name = def.key;
    if (def.movable || def.movablePath) {
      go.setInteractive();
      this.input.setDraggable(go);
      if (def.movablePath) {
        const path = def.movablePath.path;
        path.draw(this.add.graphics().lineStyle(4, 0xffffff));
        let pos = def.movablePath.pos;
        const length = path.getLength();
        const setPathPos = () => {
          const np = path.getPoint(pos / length);
          go.setPosition(np.x, np.y);
        };
        setPathPos();
        go.on("drag", (p, x, y) => {
          const tangent = path.getTangent(pos / length);
          const dir = new Phaser.Math.Vector2(x, y).subtract(
            getObjectPosition(go),
          );
          pos = Phaser.Math.Clamp(pos + tangent.dot(dir), 0, length);
          setPathPos();
        });
      } else {
        go.on("drag", (p, x, y) => {
          go.x = x;
          go.y = y;
          menuHelpers.ensureOutsideMenu(go);
        });
      }
    }
  };

  create() {
    this.cameras.main.setBackgroundColor(0x0);
    sceneDef.lights
      .filter(eventsHelpers.getEventFilter(this))
      .forEach((lightDef) => {
        const go = lightDef.create(this);
        go.depth = sourcesPlane;
        this.setCommonProps(go, lightDef);
      });
    Flow.runScene(
      this,
      Flow.parallel(
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
