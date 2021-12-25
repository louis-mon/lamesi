import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Flow from "/src/helpers/phaser-flow";
import { createImageAt, getObjectPosition } from "/src/helpers/phaser";
import * as Def from "../def";
import { makeSceneSpawner } from "/src/helpers/phaser-flow";

export const thornFlow = ({
  startPos,
  endPos,
  afterReach,
}: {
  startPos: Vector2;
  endPos: Vector2;
  afterReach: Flow.PhaserNode;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const line = new Phaser.Geom.Line(
      startPos.x,
      startPos.y,
      endPos.x,
      endPos.y,
    );
    const nodePosList = line.getPoints(0, 17);
    const angle = endPos.clone().subtract(startPos).angle();
    const spawner = makeSceneSpawner();

    return Flow.parallel(
      spawner.flow,
      Flow.sequence(
        ...nodePosList.map((nodePos, i) =>
          Flow.lazy(() => {
            const dir = i % 2 == 0 ? 1 : -1;
            const branch = createImageAt(
              scene,
              new Vector2(nodePos),
              "legs",
              "leaf-branch",
            )
              .setOrigin(0, 0.5)
              .setRotation(angle)
              .setScale(0)
              .setFlipY(dir === -1)
              .setDepth(Def.depths.legs.thornBranch);
            const leafPos = new Vector2(17, 5 * dir).rotate(angle);
            const leaf = createImageAt(
              scene,
              leafPos.clone().add(getObjectPosition(branch)),
              "legs",
              "leaf-leaf",
            )
              .setOrigin(0, 0.5)
              .setRotation(angle + (Math.PI / 6) * dir)
              .setFlipY(branch.flipY)
              .setScale(0)
              .setDepth(Def.depths.legs.thornLeaf);
            return Flow.sequence(
              Flow.waitTimer(200),
              Flow.call(() =>
                spawner.spawn(
                  Flow.sequence(
                    Flow.tween({
                      targets: branch,
                      props: { scale: 0.5 },
                      duration: 500,
                      ease: Phaser.Math.Easing.Sine.Out,
                    }),
                    Flow.tween({
                      targets: leaf,
                      props: { scale: 0.7 },
                      duration: 700,
                      ease: Phaser.Math.Easing.Sine.InOut,
                    }),
                  ),
                ),
              ),
            );
          }),
        ),
        Flow.call(() => spawner.spawn(afterReach)),
      ),
    );
  });
