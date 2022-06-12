import * as Flow from "/src/helpers/phaser-flow";
import {
  LightSceneSourceDef,
  sourcesPathPlane,
  sourcesPlane,
} from "/src/scenes/lights/lights-def";
import { LightScene } from "/src/scenes/lights/lights";
import Phaser from "phaser";
import { getObjectPosition } from "/src/helpers/phaser";

export const createLightSource = (
  lightDef: LightSceneSourceDef,
): Flow.PhaserNode =>
  Flow.lazy((s) => {
    const scene = s as LightScene;
    const go = lightDef.create(scene);
    go.depth = sourcesPlane;
    scene.setCommonProps(go, lightDef);
    if (lightDef.movablePath) {
      go.setInteractive();
      s.input.setDraggable(go);
      const path = lightDef.movablePath.path;
      path.draw(
        s.add.graphics().lineStyle(4, 0xffffff).setDepth(sourcesPathPlane),
      );
      let pos = lightDef.movablePath.pos;
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
    }
    return Flow.noop;
  });
