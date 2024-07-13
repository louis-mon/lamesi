import * as Phaser from "phaser";
import { playerCannotActSubject } from "./definitions";
import { getWpId } from "./wp";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "./definitions";

import {
  createSpriteAt,
  vecToXY,
  placeAt,
  addPhysicsFromSprite,
} from "/src/helpers/phaser";
import { playAnim, setUpAnimDurations } from "/src/helpers/animate/play-anim";

export const createPlayer = (scene: Phaser.Scene) => {
  const initialWp: Wp.WpDef = { room: 4, x: 2, y: 4 };
  scene.anims.createFromAseprite("dungeon-player");
  const player = addPhysicsFromSprite(
    scene,
    Def.player.create(
      createSpriteAt(scene, Wp.wpPos(initialWp), "dungeon-player").setDepth(
        Def.depths.npc,
      ),
    ),
  );
  player.body.setSize(35, 57);
  player.body.setOffset(18, 13);

  setUpAnimDurations(scene, "slash", [300, 50, 50, 50, 300]);
  setUpAnimDurations(scene, "death", [500, 700, 1200]);

  const currentPosData = Def.player.data.currentPos;
  const isMovingData = Def.player.data.isMoving;
  const isDeadData = Def.player.data.isDead;
  const movePlayerCanceled = Def.scene.data.movePlayerCanceled;
  const cannotAct = Def.player.data.cannotAct;
  const setPlayerWp = (wp: Wp.WpId) => {
    currentPosData.setValue(wp)(scene);
  };
  const playerSpeed = 0.2;
  Def.scene.data.playerCheckpoint.setValue(getWpId(initialWp))(scene);
  setPlayerWp(Wp.getWpId(initialWp));
  isMovingData.setValue(false)(scene);
  isDeadData.setValue(false)(scene);

  const movePlayerNext = (wpId: Wp.WpId) => {
    const wpPos = Wp.wpPos(Wp.getWpDef(wpId));
    const currentPos = () => Wp.wpPos(Wp.getWpDef(currentPosData.value(scene)));
    return Flow.lazy(() =>
      movePlayerCanceled.value(scene) || cannotAct.value(scene)
        ? Flow.noop
        : Flow.concurrent(
            Flow.whenTrueDo({
              condition: cannotAct.subject,
              action: Flow.noop,
            }),
            Flow.sequence(
              Flow.call(() => {
                const dx = wpPos.x - currentPos().x;
                if (dx === 0) return;
                player.setFlipX(dx < 0);
              }),
              Flow.tween({
                targets: player,
                props: vecToXY(wpPos),
                duration: wpPos.distance(currentPos()) / playerSpeed,
              }),
              Flow.call(() => setPlayerWp(wpId)),
            ),
          ),
    );
  };

  return Flow.parallel(
    Flow.observe(playerCannotActSubject, (cannotActValue) =>
      Flow.call(cannotAct.setValue(cannotActValue)),
    ),
    Flow.observe(Def.scene.events.movePlayer.subject, ({ path }) => {
      if (cannotAct.value(scene)) return Flow.noop;
      isMovingData.setValue(true)(scene);
      movePlayerCanceled.setValue(false)(scene);
      player.anims.play({ key: "walk", repeat: -1 });
      return Flow.sequence(
        ...path.map(movePlayerNext),
        Flow.call(() => {
          player.anims.stop();
          player.play("idle");
          isMovingData.setValue(false)(scene);
        }),
      );
    }),
    Flow.observe(Def.scene.events.killPlayer.subject, () => {
      if (isDeadData.value(scene)) return Flow.noop;
      isDeadData.setValue(true)(scene);
      return Flow.sequence(
        playAnim({ key: "death" }, player),
        Flow.call(() => {
          const newPosId = Def.scene.data.playerCheckpoint.value(scene);
          setPlayerWp(newPosId);
          placeAt(player, Wp.wpPos(Wp.getWpDef(newPosId)));
          player.play("idle");
        }),
        Flow.waitTimer(2000),
        Flow.call(isDeadData.setValue(false)),
      );
    }),
    Flow.observe(Def.scene.events.attackPlayer.subject, ({ target }) => {
      player.anims.play("slash");
      const dx = target.x - player.x;
      if (dx !== 0) {
        player.setFlipX(dx < 0);
      }
      return Flow.noop;
    }),
  );
};
