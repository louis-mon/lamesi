import { globalData } from "/src/scenes/common/global-data";
import * as Phaser from "phaser";
import { playerCannotActSubject } from "./definitions";
import { getWpId } from "./wp";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import {
  createSpriteAt,
  vecToXY,
  createImageAt,
  placeAt,
  addPhysicsFromSprite,
} from "/src/helpers/phaser";
import * as Npc from "./npc";
import { makeMenu } from "./menu";
import { annotate } from "/src/helpers/typing";
import { combineContext } from "/src/helpers/functional";
import { combineLatest } from "rxjs";
import { map } from "rxjs/operators";

export const createPlayer = (scene: Phaser.Scene) => {
  const initialWp: Wp.WpDef = { room: 4, x: 2, y: 4 };
  const player = addPhysicsFromSprite(
    scene,
    Def.player.create(
      createSpriteAt(
        scene,
        Wp.wpPos(initialWp),
        "npc",
        "player-still",
      ).setDepth(Def.depths.npc),
    ),
  );
  const currentPosData = Def.player.data.currentPos;
  const isMovingData = Def.player.data.isMoving;
  const isDeadData = Def.player.data.isDead;
  const movePlayerCanceled = Def.scene.data.movePlayerCanceled;
  const cannotAct = Def.player.data.cannotAct;
  const setPlayerWp = (wp: Wp.WpId) => {
    currentPosData.setValue(wp)(scene);
  };
  const runKey = scene.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.SHIFT,
  );
  const playerSpeed = () =>
    runKey.isDown && globalData.cheatCodes.value(scene) ? 0.4 : 0.2;
  scene.anims.create({
    key: "walk",
    repeat: -1,
    duration: 500,
    frames: scene.anims.generateFrameNames("npc", {
      start: 1,
      end: 2,
      prefix: "player-move-",
      zeroPad: 2,
    }),
  });
  Def.scene.data.playerCheckpoint.setValue(getWpId(initialWp))(scene);
  setPlayerWp(Wp.getWpId(initialWp));
  isMovingData.setValue(false)(scene);
  isDeadData.setValue(false)(scene);

  const movePlayerNext = (wpId: Wp.WpId) => {
    const wpPos = Wp.wpPos(Wp.getWpDef(wpId));
    return Flow.lazy(() =>
      movePlayerCanceled.value(scene) || cannotAct.value(scene)
        ? Flow.noop
        : Flow.concurrent(
            Flow.whenTrueDo({
              condition: cannotAct.subject,
              action: Flow.noop,
            }),
            Flow.sequence(
              Flow.tween({
                targets: player,
                props: vecToXY(wpPos),
                duration:
                  wpPos.distance(
                    Wp.wpPos(Wp.getWpDef(currentPosData.value(scene))),
                  ) / playerSpeed(),
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
      player.anims.play("walk");
      return Flow.sequence(
        ...path.map(movePlayerNext),
        Flow.call(() => {
          player.anims.stop();
          player.setFrame("player-still");
          isMovingData.setValue(false)(scene);
        }),
      );
    }),
    Flow.observe(Def.scene.events.killPlayer.subject, () => {
      if (isDeadData.value(scene)) return Flow.noop;
      isDeadData.setValue(true)(scene);
      return Flow.sequence(
        Flow.call(() => {
          const newPosId = Def.scene.data.playerCheckpoint.value(scene);
          setPlayerWp(newPosId);
          placeAt(player, Wp.wpPos(Wp.getWpDef(newPosId)));
        }),
        Flow.waitTimer(2000),
        Flow.call(isDeadData.setValue(false)),
      );
    }),
  );
};
