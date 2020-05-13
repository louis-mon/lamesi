import * as Phaser from "phaser";
import { menuZoneSize } from "/src/scenes/common";
import * as Flow from "/src/helpers/phaser-flow";
import * as Graph from "/src/helpers/math/graph";
import * as Geom from "/src/helpers/math/geom";

import Vector2 = Phaser.Math.Vector2;
import _ from "lodash";
import { DataHelper, makeDataHelper } from "/src/helpers/data";

export type WpDef = { room: number; x: number; y: number };
export type WpId = string & { __wpIdTag: null };
export const declareWpId = (id: string) => id as WpId;
export const getWpId = ({ room, x, y }: WpDef): WpId =>
  declareWpId(`wp-${room}-${x}-${y}`);

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
  moveAction: (newWp: WpId) => Flow.PhaserNode;
  startMoveAction: Flow.PhaserNode;
  endMoveAction: Flow.PhaserNode;
  currentPosition: DataHelper<WpId>;
};

const areWpBaseLinked = (wp1: WpDef, wp2: WpDef) => {
  return (
    wp1.room === wp2.room && new Vector2(wp1).distanceSq(new Vector2(wp2)) <= 1
  );
};

const RoomRectangle = new Phaser.Geom.Rectangle(0, 0, 4, 4);

const allWp: WpDef[] = _.flatMap(_.range(6), (i) =>
  _.range(25).map((posI) => ({ ...Phaser.Math.ToXY(posI, 5, 5), room: i })),
);
const allWpById = _.keyBy(allWp, getWpId);

export const getWpDef = (id: WpId): WpDef => allWpById[id];

type WpGraph = { [key: string]: { links: WpId[] } };
const initialWpGraph = (): WpGraph => {
  return _.mapValues(allWpById, (wp, id) => ({
    links: Geom.pointsAround(new Vector2(wp), 1)
      .filter(({ x, y }) => RoomRectangle.contains(x, y))
      .map(({ x, y }) => getWpId({ room: wp.room, x, y })),
  }));
};

export const wpSceneHelper = (scene: Phaser.Scene) => {
  const isActive = makeDataHelper<boolean>(scene, "wp-is-active");
  const wpGraph = makeDataHelper<WpGraph>(scene, "wp-graph");

  const wpHelper = (wp: WpDef) => {
    const getObj = () => scene.children.getByName(getWpId(wp));
    return {
      getObj,
      getActive: () => makeDataHelper(getObj()!, "is-active"),
    };
  };

  const disabledScale = 0.2;

  const placeWps = ({
    moveAction,
    currentPosition,
    startMoveAction,
    endMoveAction,
  }: PlaceWpParams) => {
    isActive.setValue(false);
    wpGraph.setValue(initialWpGraph());

    const performBfs = () =>
      Graph.bfs({
        graph: { links: (v) => wpGraph.value()[v].links },
        startPoint: currentPosition.value(),
      });

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
        const allowedWp = performBfs();
        _.keys(allowedWp.paths).forEach((wpId) => {
          toggleWp({
            wpDef: getWpDef(declareWpId(wpId)),
            isActive: true,
            scale: 1,
          });
        });
      } else {
        allWp.forEach((wpDef) => {
          toggleWp({ wpDef, isActive: false, scale: disabledScale });
        });
      }
    });
    allWp.forEach((wpDef) => {
      const wpId = getWpId(wpDef);
      const { x, y } = wpPos(wpDef);
      const wp = scene.add.circle(x, y, 10, 0xffffff, 0.3);
      wp.scale = disabledScale;
      wp.setName(wpId);
      wp.setInteractive();
      wp.input.hitArea = new Phaser.Geom.Rectangle(-25, -25, 70, 70);
      wp.on("pointerdown", () => {
        if (!(isActive.value() && wpHelper(wpDef).getActive().value())) return;
        isActive.setValue(false);
        const wpsPath = Graph.extractPath(performBfs(), wpId);
        Flow.execute(
          scene,
          Flow.sequence(
            startMoveAction,
            ...wpsPath.map(moveAction),
            endMoveAction,
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
