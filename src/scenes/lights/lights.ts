import * as Phaser from "phaser";
import { ManipulableObject, getObjectPosition } from "/src/helpers/phaser";
import { debugObjectPos } from "../common";
import {
  sceneDef,
  LightSceneMaterialDef,
  ObjectCreationDef,
  LightSceneSourceDef,
} from "./lights-def";
import { eventsHelpers } from "../global-events";
import { gameWidth, gameHeight } from "/src/scenes/common";
import { menuHelpers } from "../menu";

const goalPlane = 0;
const shadowPlane = goalPlane + 1;
const materialsPlane = shadowPlane + 1;
const sourcesPlane = materialsPlane + 1;

const shadowName = (matKey: string, sourceDef: LightSceneSourceDef) =>
  `${matKey}-${sourceDef.key}-shadow`;

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
  private shadows: Array<{
    source: ManipulableObject;
    material: ManipulableObject;
    shadow: ManipulableObject;
    def: LightSceneMaterialDef;
  }> = [];
  private goalFound?: Phaser.Time.TimerEvent;
  create() {
    const setCommonProps = (go: ManipulableObject, def: ObjectCreationDef) => {
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
    sceneDef.lights
      .filter(eventsHelpers.getEventFilter(this))
      .forEach((lightDef) => {
        const go = lightDef.create(this);
        go.depth = sourcesPlane;
        setCommonProps(go, lightDef);
      });
    sceneDef.materials
      .filter(eventsHelpers.getEventFilter(this))
      .forEach((matDef, i) => {
        const go = matDef.create(this);
        setCommonProps(go, matDef);
        let depth = matDef.depth;
        go.scale = 1 / depth;
        go.depth = materialsPlane;
        sceneDef.lights.forEach((lightDef) => {
          const lightObj = this.children.getByName(lightDef.key);
          if (!lightObj) return;
          const shadow = matDef.create(this);
          debugObjectPos(this, shadow);
          shadow.name = shadowName(matDef.key, lightDef);
          shadow.depth = shadowPlane;
          shadow.alpha = 0.5;
          this.shadows.push({
            source: lightObj as ManipulableObject,
            material: go,
            shadow,
            def: matDef,
          });
        });
        if (matDef.rope) {
          const { minDepth, maxDepth } = matDef.rope;
          const ropeObj = this.add.image(gameWidth - 30 * i - 20, 0, "rope");
          const ropeIcon = matDef.create(this);
          ropeIcon.scale = 25 / ropeIcon.width;
          ropeObj.setOrigin(0.5, 1);
          ropeObj.setInteractive();
          this.input.setDraggable(ropeObj);
          const yposMin = 50;
          const yAmpl = gameHeight - 50;
          this.events.on("update", () => {
            go.scale = 1 / depth;
            ropeObj.y = Phaser.Math.Linear(yposMin, yposMin + yAmpl, 1 - depth);
            ropeIcon.setPosition(ropeObj.x, ropeObj.y + 30);
          });
          ropeObj.on("drag", (pointer, x, y) => {
            depth = Phaser.Math.Clamp(
              depth - (y - ropeObj.y) / yAmpl,
              minDepth,
              maxDepth,
            );
          });
        }
      });
    sceneDef.goals.forEach((goalDef) => {
      const go = goalDef.create(this);
      setCommonProps(go, goalDef);
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
      const go = this.children.getByName(goalDef.key)!;
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
          this.tweens.add({
            targets: go,
            props: { scale: 1.4 },
            repeat: 1,
            yoyo: true,
            duration: 700,
            onComplete: () =>
              this.tweens.add({
                targets: go,
                props: { alpha: 0.5 },
              }),
          });
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
