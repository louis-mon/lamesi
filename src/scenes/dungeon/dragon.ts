import { createSpriteAt, getObjectPosition } from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { launchFireball } from "/src/scenes/dungeon/fireball";
import _ from "lodash";
import * as Phaser from "phaser";
import { map } from "rxjs/operators";
import * as Def from "./definitions";
import * as Wp from "./wp";
import Vector2 = Phaser.Math.Vector2;

export const dragon: Flow.PhaserNode = Flow.lazy((scene) => {
  const basePos = new Vector2(0, -9.0).add(Wp.wpPos({ room: 1, x: 2, y: 1 }));
  const bodyObj = createSpriteAt(scene, basePos, "dragon", "body").setDepth(
    Def.depths.npc,
  );
  const headPos = new Vector2(0, -60).add(basePos);
  const headObj = createSpriteAt(scene, headPos, "dragon", "head").setDepth(
    Def.depths.floating,
  );
  const wingObjs = [1, -1].map((flip) =>
    createSpriteAt(
      scene,
      new Vector2(flip * 50, 0).add(basePos),
      "dragon",
      "wing",
    )
      .setFlipX(flip === 1)
      .setDepth(Def.depths.npc),
  );
  const footObjs = [1, -1].map((flip) =>
    createSpriteAt(
      scene,
      new Vector2(flip * 50, 50).add(basePos),
      "dragon",
      "foot",
    )
      .setFlipX(flip === 1)
      .setDepth(Def.depths.npc),
  );
  return Flow.parallel(
    Flow.repeatWhen({
      condition: () =>
        Def.player.data.currentPos
          .dataSubject(scene)
          .pipe(map((wpId) => Wp.getWpDef(wpId).room === 1)),
      action: Flow.sequence(
        Flow.waitTimer(1000),
        Flow.parallel(
          ..._.range(0, 14).map((i) =>
            Flow.sequence(
              Flow.waitTimer(i * 70),
              Flow.lazy(() =>
                Flow.parallel(
                  ..._.range(-2, 3).map((i) =>
                    launchFireball({
                      radius: 75,
                      fromPos: headPos,
                      targetPos: Phaser.Math.RotateAround(
                        getObjectPosition(Def.player.getObj(scene)).clone(),
                        headPos.x,
                        headPos.y,
                        (i * Math.PI) / 15,
                      ),
                    }),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    }),
  );
});
