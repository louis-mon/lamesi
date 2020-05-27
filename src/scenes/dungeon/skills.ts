import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Npc from "./npc";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt, getObjectPosition } from "/src/helpers/phaser";
import {
  defineGoClass,
  declareGoInstance,
  commonInputEvents,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import { take, map, tap, first } from "rxjs/operators";
import { of } from "rxjs";
import { combineContext } from "/src/helpers/functional";

export const initSkills: Flow.PhaserNode = Flow.call((scene) => {
  Def.scene.data.arrowAvailable.setValue(false)(scene);
  Def.scene.data.currentSkill.setValue("")(scene);
});

const arrowClass = defineGoClass({
  data: {},
  events: {},
  kind: annotate<Phaser.GameObjects.Sprite>(),
});

export const arrowSkill: Flow.PhaserNode = Flow.lazy((scene) => {
  const arrowDef = declareGoInstance(arrowClass, "player-arrow");
  return Flow.when({
    condition: Def.scene.data.arrowAvailable.subject,
    //condition: of(true),
    action: Npc.altarComponent({
      key: "arrow-skill",
      wp: { room: 5, x: 4, y: 0 },
      createItem: ({ pos }) => (scene) =>
        createSpriteAt(scene, pos, "menu", "magic-arrow"),
      action: Flow.sequence(
        Flow.observe(
          commonInputEvents.pointerdown.subject(scene).pipe(
            first(),
            map(({ pointer }) =>
              Flow.lazy(() => {
                const arrowObj = scene.physics.add.existing(
                  arrowDef
                    .create(
                      createSpriteAt(
                        scene,
                        getObjectPosition(Def.player.getObj(scene)),
                        "menu",
                        "magic-arrow",
                      ),
                    )
                    .setDepth(Def.depths.floating),
                ) as Phaser.Physics.Arcade.Sprite;
                scene.physics.moveTo(
                  arrowObj,
                  pointer.worldX,
                  pointer.worldY,
                  700,
                );
                arrowObj.rotation =
                  arrowObj.body.velocity.angle() - (Math.PI / 4) * 3;
                return Flow.parallel(
                  Flow.observe(
                    Flow.observeArcadeOverlap({
                      object1: Def.scene.data.interactableGroup.value(scene),
                      object2: arrowObj,
                    }),
                    ({ object1, object2 }) =>
                      Flow.call(
                        combineContext(
                          Def.interactableEvents
                            .hitPhysical(object1.name)
                            .emit({}),
                          Def.interactableEvents
                            .hitPhysical(object2.name)
                            .emit({}),
                          () => arrowObj.destroy(),
                        ),
                      ),
                  ),
                  Flow.sequence(
                    Flow.waitTimer(1000),
                    Flow.call(() => arrowObj.destroy()),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    }).activateAltar,
  });
});
