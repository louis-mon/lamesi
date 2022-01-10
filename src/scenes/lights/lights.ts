import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { ManipulableObject, getObjectPosition } from "/src/helpers/phaser";
import {
  sceneDef,
  LightSceneMaterialDef,
  ObjectCreationDef,
  sourcesPlane,
  goalPlane,
  shadowName,
} from "./lights-def";
import { eventsHelpers } from "../common/global-data";
import { solveLight } from "/src/scenes/lights/solve-light";
import { menuHelpers } from "/src/scenes/menu/menu-scene-def";
import { createMaterial } from "/src/scenes/lights/materials";

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
    this.load.image("goal-2");
    this.load.image("goal-3");
    this.load.image("goal-4");
    this.load.image("goal-5");
    this.load.image("rope");
  }

  public shadows: Array<{
    source: ManipulableObject;
    material: ManipulableObject;
    shadow: ManipulableObject;
    def: LightSceneMaterialDef;
  }> = [];
  private goalFound?: Phaser.Time.TimerEvent;

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
      Flow.parallel(...sceneDef.materials.map(createMaterial)),
    );
    sceneDef.goals
      .filter(eventsHelpers.getEventFilter(this))
      .forEach((goalDef) => {
        const go = goalDef.create(this);
        this.setCommonProps(go, goalDef);
        go.depth = goalPlane;
      });
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
    const oneGoalReached = sceneDef.goals.reduce((found, goalDef) => {
      const go = this.children.getByName(goalDef.key)! as ManipulableObject;
      const reachGoal = goalDef.requires.every(
        ({ materialKey, position, width }) =>
          sceneDef.lights.some((lightDef) => {
            const shadow = this.children.getByName(
              shadowName(materialKey, lightDef),
            ) as ManipulableObject;
            if (!shadow) return false;
            const sizeMatch = Phaser.Math.Within(
              shadow.displayWidth,
              width,
              10,
            );
            return (
              sizeMatch &&
              new Phaser.Geom.Circle(position.x, position.y, 10).contains(
                shadow.x,
                shadow.y,
              )
            );
          }),
      );
      if (reachGoal && !this.goalFound) {
        this.goalFound = this.time.delayedCall(2000, () => {
          if (go.getData("done")) return;
          go.toggleData("done");
          Flow.run(this, solveLight({ goalDef, target: go }));
        });
      }
      return found || reachGoal;
    }, false);
    if (!oneGoalReached && this.goalFound) {
      this.goalFound.remove();
      this.goalFound = undefined;
    }
  }
}
