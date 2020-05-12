import * as Phaser from "phaser";
import { menuZoneSize } from "/src/scenes/common";
import * as Flow from "/src/helpers/phaser-flow";

import Vector2 = Phaser.Math.Vector2;
import _ from "lodash";
import { DataHelper, makeDataHelper } from "/src/helpers/data";

export type WpDef = { room: number; x: number; y: number };
const wpName = ({ room, x, y }: WpDef) => `wp-${room}-${x}-${y}`;

const roomSize = new Vector2(500, 400);
const roomMargin = new Vector2(100, 50);
const roomPadding = new Vector2(20, 15);
const scenePos = new Vector2(menuZoneSize + 20, 150);
export const wpPos = (wp: WpDef) => {
  const roomPos = Phaser.Math.ToXY(wp.room, 3, 2);
  return scenePos
    .clone()
    .add(roomPadding)
    .add(
      roomPos
        .clone()
        .multiply(roomSize.clone().add(roomMargin))
        .add(
          new Vector2(wp)
            .clone()
            .multiply(roomSize)
            .scale(1 / 5),
        ),
    );
};

export type PlaceWpParams = {
  moveAction: (newWp: WpDef) => Flow.PhaserNode;
  currentPosition: DataHelper<WpDef>;
};

const areWpBaseLinked = (wp1: WpDef, wp2: WpDef) => {
  return (
    wp1.room === wp2.room && new Vector2(wp1).distanceSq(new Vector2(wp2)) <= 1
  );
};

export const wpSceneHelper = (scene: Phaser.Scene) => {
  const allWp: WpDef[] = _.flatMap(_.range(6), (i) =>
    _.range(25).map((posI) => ({ ...Phaser.Math.ToXY(posI, 5, 5), room: i })),
  );

  const isActive = makeDataHelper<boolean>(scene, "wp-is-active");
  isActive.setValue(false);

  const wpHelper = (wp: WpDef) => {
    const getObj = () => scene.children.getByName(wpName(wp));
    return {
      getObj,
      getActive: () => makeDataHelper(getObj()!, "is-active"),
    };
  };

  const disabledScale = 0.2;

  const placeWps = ({ moveAction, currentPosition }: PlaceWpParams) => {
    isActive.onChange(({ value }) => {
      const toggleWp = ({
        wpDef,
        scale,
        isActive,
      }: {
        scale: number;
        isActive: boolean;
        wpDef: WpDef;
      }) => {
        const helper = wpHelper(wpDef);
        Flow.execute(
          scene,
          Flow.sequence(
            Flow.tween(() => ({
              targets: helper.getObj(),
              props: { scale },
              duration: 200,
            })),
            Flow.call(() => helper.getActive().setValue(isActive)),
          ),
        );
      };
      if (value) {
        allWp.forEach((wpDef) => {
          if (!areWpBaseLinked(wpDef, currentPosition.value())) return;
          toggleWp({ wpDef, isActive: true, scale: 1 });
        });
      } else {
        allWp.forEach((wpDef) => {
          toggleWp({ wpDef, isActive: false, scale: disabledScale });
        });
      }
    });
    allWp.forEach((wpDef) => {
      const { x, y } = wpPos(wpDef);
      const wp = scene.add.circle(x, y, 10, 0xffffff, 0.3);
      wp.scale = disabledScale;
      wp.setName(wpName(wpDef));
      wp.setInteractive();
      wp.input.hitArea = new Phaser.Geom.Rectangle(-25, -25, 70, 70);
      wp.on("pointerdown", () => {
        if (!(isActive.value() && wpHelper(wpDef).getActive().value())) return;
        isActive.setValue(false);
        Flow.execute(
          scene,
          Flow.sequence(
            moveAction(wpDef),
            Flow.call(() => {
              isActive.setValue(true);
            }),
          ),
        );
      });
    });
  };

  return {
    placeWps,
    isActive,
  };
};
