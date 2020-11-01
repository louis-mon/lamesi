import {
  createSpriteAt,
  getObjectPosition,
  placeAt,
} from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { launchFireball } from "/src/scenes/dungeon/fireball";
import _ from "lodash";
import * as Phaser from "phaser";
import { map } from "rxjs/operators";
import * as Def from "./definitions";
import * as Wp from "./wp";
import Vector2 = Phaser.Math.Vector2;
import { getProp } from "/src/helpers/functional";

export const dragon: Flow.PhaserNode = Flow.lazy((scene) => {
  const basePos = new Vector2(0, -25.0).add(Wp.wpPos({ room: 1, x: 2, y: 1 }));
  const wingDefs = [1, -1].map((flip) => {
    const startAngle = -10 * flip;
    const wing = createSpriteAt(
      scene,
      new Vector2(flip * 24, -40).add(basePos),
      "dragon",
      "wing",
    )
      .setFlipX(flip === 1)
      .setAngle(startAngle)
      .setDepth(Def.depths.npc)
      .setOrigin(1, 0.3);
    return {
      wing,
      enter: Flow.tween({
        targets: wing,
        props: {
          angle: flip * 20,
        },
        duration: 400,
        yoyo: true,
        repeat: -1,
      }),
      end: Flow.tween({
        targets: wing,
        props: {
          angle: startAngle,
        },
        duration: 900,
      }),
    };
  });
  const bodyObj = createSpriteAt(
    scene,
    new Vector2(0, 16).add(basePos),
    "dragon",
    "body",
  ).setDepth(Def.depths.npc);
  const headPos = new Vector2(0, -70).add(basePos);
  const headObj = createSpriteAt(scene, headPos, "dragon", "head").setDepth(
    Def.depths.npcHigh,
  );
  const footObjs = [1, -1].map((flip) =>
    createSpriteAt(
      scene,
      new Vector2(flip * 50, 60).add(basePos),
      "dragon",
      "foot",
    )
      .setFlipX(flip === 1)
      .setDepth(Def.depths.npc),
  );
  const eyeFlows = [1, -1].map((flip) => {
    const eye = createSpriteAt(scene, new Vector2(0, 0), "dragon", "eye-closed")
      .setFlipX(flip === 1)
      .setDepth(Def.depths.npcHigh + 1);
    return {
      eye,
      flow: Flow.repeat(
        Flow.parallel(
          Flow.call(() => {
            placeAt(
              eye,
              getObjectPosition(headObj).add(new Vector2(flip * 15, 0)),
            );
          }),
          Flow.waitTimer(0),
        ),
      ),
    };
  });
  const eyeObjs = eyeFlows.map(getProp("eye"));

  const playerInRoom = () =>
    Def.player.data.currentPos
      .dataSubject(scene)
      .pipe(map((wpId) => Wp.getWpDef(wpId).room === 1));

  return Flow.parallel(
    ...eyeFlows.map(getProp("flow")),
    Flow.taskWithSentinel({
      condition: playerInRoom,
      task: Flow.parallel(
        Flow.call(() => eyeObjs.forEach((eye) => eye.setFrame("eye-open"))),
        ...wingDefs.map(getProp("enter")),
      ),
      endTask: Flow.parallel(
        Flow.call(() => eyeObjs.forEach((eye) => eye.setFrame("eye-closed"))),
        ...wingDefs.map(getProp("end")),
      ),
    }),
    Flow.repeatWhen({
      condition: playerInRoom,
      action: Flow.sequence(
        Flow.waitTimer(800),
        Flow.parallel(
          ..._.range(0, 14).map((i) =>
            Flow.sequence(
              Flow.waitTimer(i * 70),
              Flow.lazy(() =>
                Flow.parallel(
                  ..._.range(-2, 3).map((i) =>
                    launchFireball({
                      radius: 75,
                      startScale: 0.2,
                      fromPos: headObj.getBottomCenter(),
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
