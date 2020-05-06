import * as Phaser from "phaser";
import { ManipulableObject } from "../../helpers/phaser";
import {
  sceneDef,
  LightSceneMaterialDef,
  ObjectCreationDef,
  LightSceneSourceDef
} from "./lights-def";
import { eventsHelpers } from "../global-events";

const getObjectPosition = ({ x, y }: Phaser.GameObjects.Components.Transform) =>
  new Phaser.Math.Vector2(x, y);

const goalPlane = 0;
const shadowPlane = goalPlane + 1;
const materialsPlane = shadowPlane + 1;
const sourcesPlane = materialsPlane + 1;

const shadowName = (matKey: string, sourceDef: LightSceneSourceDef) =>
  `${matKey}-${sourceDef.key}-shadow`;

export class LightScene extends Phaser.Scene {
  constructor() {
    super({
      key: "lights"
    });
  }
  preload() {
    this.load.setBaseURL("src/assets");
  }
  private shadows: Array<{
    source: ManipulableObject;
    material: ManipulableObject;
    shadow: ManipulableObject;
    def: LightSceneMaterialDef;
  }> = [];
  private goalFound?: Phaser.Time.TimerEvent;
  create() {
    const setCommonProps = (o: ManipulableObject, def: ObjectCreationDef) => {
      o.name = def.key;
    };
    sceneDef.lights
      .filter(eventsHelpers.getEventFilter(this))
      .forEach(lightDef => {
        const go = lightDef.create(this);
        go.depth = sourcesPlane;
        setCommonProps(go, lightDef);
        go.setInteractive();
        this.input.setDraggable(go);
        go.on("drag", (p, x, y) => {
          go.x = x;
          go.y = y;
        });
      });
    sceneDef.materials
      .filter(eventsHelpers.getEventFilter(this))
      .forEach(matDef => {
        const go = matDef.create(this);
        go.depth = materialsPlane;
        setCommonProps(go, matDef);
        go.setInteractive();
        this.input.setDraggable(go);
        go.on("drag", (p, x, y) => {
          go.x = x;
          go.y = y;
        });
        sceneDef.lights.forEach(lightDef => {
          const lightObj = this.children.getByName(lightDef.key);
          if (!lightObj) return;
          const shadow = matDef.create(this);
          shadow.name = shadowName(matDef.key, lightDef);
          shadow.depth = shadowPlane;
          shadow.alpha = 0.5;
          this.shadows.push({
            source: lightObj as ManipulableObject,
            material: go,
            shadow,
            def: matDef
          });
        });
      });
    sceneDef.goals.forEach(goalDef => {
      const go = goalDef.create(this);
      setCommonProps(go, goalDef);
      go.depth = goalPlane;
    });
  }
  update() {
    this.shadows.forEach(({ source, shadow, material, def }) => {
      const sourcePos = getObjectPosition(source);
      const { x, y } = getObjectPosition(material)
        .clone()
        .subtract(sourcePos)
        .scale(1 / def.depth)
        .add(sourcePos);
      shadow.setPosition(x, y);
      shadow.setScale(1 / def.depth);
    });
    const oneGoalReached = sceneDef.goals.reduce((found, goalDef) => {
      const go = this.children.getByName(goalDef.key)!;
      const reachGoal = goalDef.requires.every(({ materialKey, position }) =>
        sceneDef.lights.some(lightDef => {
          const shadow = this.children.getByName(
            shadowName(materialKey, lightDef)
          ) as ManipulableObject;
          if (!shadow) return false;
          return new Phaser.Geom.Circle(position.x, position.y, 10).contains(
            shadow.x,
            shadow.y
          );
        })
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
                props: { alpha: 0.5 }
              })
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
