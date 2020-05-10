import * as Phaser from "phaser";
import _ from "lodash";
import { menuZoneSize } from "/src/scenes/common";

import Vector2 = Phaser.Math.Vector2;

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super({
      key: "dungeon",
    });
  }

  create() {
    const roomSize = new Vector2(500, 400);
    const roomMargin = new Vector2(100, 50);
    const roomPadding = new Vector2(20, 15);
    const roomsPos = new Vector2(menuZoneSize + 20, 150);
    _.range(6).forEach((i) => {
      const roomPos = Phaser.Math.ToXY(i, 3, 2);
      _.range(25).forEach((posI) => {
        const wpPos = Phaser.Math.ToXY(posI, 5, 5);
        const { x, y } = roomsPos
          .clone()
          .add(roomPadding)
          .add(
            roomPos
              .clone()
              .multiply(roomSize.clone().add(roomMargin))
              .add(
                wpPos
                  .clone()
                  .multiply(roomSize)
                  .scale(1 / 5),
              ),
          );
        const wp = this.add.circle(x, y, 10, 0xffffff, 0.3);
        wp.setInteractive();
        wp.input.hitArea = new Phaser.Geom.Rectangle(-25, -25, 70, 70);
        wp.on("pointerdown", () => {
          wp.input.enabled = false;
          this.add.tween({
            targets: wp,
            props: { scale: 2 },
            duration: 100,
            yoyo: true,
            onComplete: () => {
              wp.input.enabled = true;
            },
          });
        });
      });
    });
  }
}
