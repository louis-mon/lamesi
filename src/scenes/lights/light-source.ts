import * as Flow from "/src/helpers/phaser-flow";
import {
  ambiancePlane,
  LightSceneMaterialDef,
  LightSceneSourceDef,
  sceneDef,
  shadowName,
  sourcesPathPlane,
  sourcesPlane,
} from "/src/scenes/lights/lights-def";
import { LightScene } from "/src/scenes/lights/lights";
import Phaser from "phaser";
import {
  createImageAt,
  getObjectPosition,
  ManipulableObject,
} from "/src/helpers/phaser";
import Vector2 = Phaser.Math.Vector2;
import _ from "lodash";
import { isEventReady } from "/src/scenes/common/events-def";

function isLeftTurn(
  p: Phaser.Geom.Point,
  q: Phaser.Geom.Point,
  r: Phaser.Geom.Point,
): boolean {
  return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x) > 0;
}

function computeConvexHull(points: Phaser.Geom.Point[]): Phaser.Geom.Point[] {
  const hull: Phaser.Geom.Point[] = [];

  let pointOnHull: Phaser.Geom.Point = points.reduce(
    (leftmost, point) => (point.x < leftmost.x ? point : leftmost),
    points[0],
  );
  let endpoint: Phaser.Geom.Point;

  do {
    hull.push(pointOnHull);
    endpoint = points[0];

    for (let i = 1; i < points.length; i++) {
      if (
        endpoint === pointOnHull ||
        isLeftTurn(pointOnHull, endpoint, points[i])
      ) {
        endpoint = points[i];
      }
    }

    pointOnHull = endpoint;
  } while (endpoint !== hull[0]);

  return hull;
}

function createRays(scene: Phaser.Scene) {
  const graphics = scene.add.graphics({
    fillStyle: { color: 0xd6f57b, alpha: 0.15 },
  });
  const grad = 10;
  const nRay = (grad * 2 + 1) * 7;
  _.range(nRay).forEach((i) => {
    const angle = ((2 * Math.PI) / nRay) * i;
    const iStep = i % (grad * 2 + 1);
    graphics.fillStyle(0xffffcc, (Math.abs(iStep - grad) / grad) * 0.15 + 0.08);
    const p1 = new Vector2().setToPolar(angle + (2 * Math.PI) / nRay / 2, 2500);
    const p2 = new Vector2().setToPolar(angle - (2 * Math.PI) / nRay / 2, 2500);
    graphics.fillTriangle(0, 0, p1.x, p1.y, p2.x, p2.y);
  });
  return graphics;
}

function createRaysAlt(scene: Phaser.Scene) {
  return scene.add.pointlight(0, 0, 0xd6f57b, 2000, 0.0005, 3);
}

function createOverShadow({
  scene,
  lightDef,
}: {
  scene: Phaser.Scene;
  lightDef: LightSceneSourceDef;
}) {
  const light = scene.children.getByName(lightDef.key) as ManipulableObject;
  const rays = createRays(scene)
    .setDepth(ambiancePlane)
    .setPosition(light.x, light.y);
  const graphics = scene.add.graphics().setVisible(false);
  rays.setMask(graphics.createGeometryMask().setInvertAlpha(true));

  function pointsOfShape(
    matDef: LightSceneMaterialDef,
    target: ManipulableObject,
  ) {
    const points = (matDef.getContourPoints ?? matDef.getPoints)();
    const rect = Phaser.Geom.Point.GetRectangleFromPoints(points);
    return points.map(
      (p) =>
        new Phaser.Geom.Point(
          (p.x - rect.centerX) * target.scale + target.x,
          (p.y - rect.centerY) * target.scale + target.y,
        ),
    );
  }

  Flow.runScene(
    scene,
    Flow.handlePostUpdate({
      handler: () => () => {
        rays.angle += 0.05;
        rays.setPosition(light.x, light.y);
        graphics.clear();
        graphics.fillStyle(0xff0000, 0.3);
        sceneDef.materials.forEach((def) => {
          const mat = scene.children.getByName(def.key) as ManipulableObject;
          const shadow = scene.children.getByName(
            shadowName(def.key, lightDef),
          ) as ManipulableObject;
          if (!mat?.alpha || !shadow) return;
          const points = computeConvexHull(
            pointsOfShape(def, mat).concat(pointsOfShape(def, shadow)),
          );
          graphics.fillPoints(points, true);
        });
      },
    }),
  );
}

export const createLightSource = (
  lightDef: LightSceneSourceDef,
): Flow.PhaserNode =>
  Flow.lazy((s) => {
    const scene = s as LightScene;
    if (!isEventReady(lightDef.eventRequired)(scene)) {
      return Flow.noop;
    }
    const go = createImageAt(
      scene,
      lightDef.position,
      "materials",
      "light-source",
    );
    const pLight = scene.add.pointlight(
      lightDef.position.x,
      lightDef.position.y,
      0xffffcc,
      60,
      1,
      0.1,
    );

    go.depth = sourcesPlane;
    scene.setCommonProps(go, lightDef);
    if (lightDef.movablePath) {
      let arrow: Phaser.GameObjects.Image | null = createImageAt(
        scene,
        getObjectPosition(go),
        "materials",
        "move-arrow",
      ).setDepth(sourcesPlane);
      scene.add.tween({
        targets: arrow,
        props: { alpha: 0 },
        yoyo: true,
        repeat: -1,
      });
      go.setInteractive();
      s.input.setDraggable(go);
      const path = lightDef.movablePath.path;
      path.draw(
        s.add.graphics().lineStyle(4, 0xffffff).setDepth(sourcesPathPlane),
      );
      let pos = lightDef.movablePath.pos;
      const length = path.getLength();
      const tutoDistSq = 200 ** 2;
      const setPathPos = () => {
        const np = path.getPoint(pos / length);
        if (arrow && np.distanceSq(lightDef.position) > tutoDistSq) {
          arrow.destroy();
          arrow = null;
        }
        go.setPosition(np.x, np.y);
        pLight.setPosition(np.x, np.y);
        arrow?.setPosition(np.x, np.y);
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
    createOverShadow({ scene, lightDef });
    return Flow.noop;
  });
