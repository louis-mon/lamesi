import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import * as Graph from "/src/helpers/math/graph";
import * as Geom from "/src/helpers/math/geom";
import { WpId, player } from "./definitions";
export { WpId } from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import _ from "lodash";
import { DataHelper, makeDataHelper } from "/src/helpers/data";
import { menuZoneSize } from "../menu";
import { combineLatest } from "rxjs";
import { auditTime, map } from "rxjs/operators";

export type WpDef = { room: number; x: number; y: number };
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

const dataDef = {
  isActive: (scene: Phaser.Scene) =>
    makeDataHelper<boolean>(scene, "wp-is-active"),
  wpGraph: (scene: Phaser.Scene) => makeDataHelper<WpGraph>(scene, "wp-graph"),
};

const openGraphLinkDir = (graph: WpGraph, wp1: WpId, wp2: WpId): WpGraph => ({
  ...graph,
  [wp1]: { ...graph[wp1], links: _.union(graph[wp1].links, [wp2]) },
});

export const openGraphLink = (scene: Phaser.Scene, wp1: WpId, wp2: WpId) => {
  dataDef
    .wpGraph(scene)
    .updateValue((graph) =>
      openGraphLinkDir(openGraphLinkDir(graph, wp1, wp2), wp2, wp1),
    );
};

export const wpSceneHelper = (scene: Phaser.Scene) => {
  const isActiveData = dataDef.isActive(scene);
  const wpGraphData = dataDef.wpGraph(scene);

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
    startMoveAction,
    endMoveAction,
  }: PlaceWpParams) => {
    isActiveData.setValue(false);
    wpGraphData.setValue(initialWpGraph());

    const currentPosData = player.data.currentPos(scene);

    const performBfs = () =>
      Graph.bfs({
        graph: { links: (v) => wpGraphData.value()[v].links },
        startPoint: currentPosData.value(),
      });

    Flow.run(
      scene,
      Flow.fromObservable(
        combineLatest([
          wpGraphData.observe(),
          currentPosData.observe(),
          isActiveData.observe(),
        ]).pipe(
          auditTime(50),
          map(([, , isActive]) => {
            const toggleWp = ({
              wpDef,
              scale,
            }: {
              scale: number;
              wpDef: WpDef;
            }) => {
              const helper = wpHelper(wpDef);
              return Flow.sequence(
                Flow.tween({
                  targets: helper.getObj(),
                  props: { scale },
                  duration: 200,
                }),
                Flow.call(() => helper.getActive().setValue(isActive)),
              );
            };
            if (isActive) {
              const allowedWp = performBfs();
              return Flow.parallel(
                ..._.keys(allowedWp.paths).map((wpId) =>
                  toggleWp({
                    wpDef: getWpDef(declareWpId(wpId)),
                    scale: 1,
                  }),
                ),
              );
            } else {
              return Flow.parallel(
                ...allWp.map((wpDef) =>
                  toggleWp({ wpDef, scale: disabledScale }),
                ),
              );
            }
          }),
        ),
      ),
    );
    allWp.forEach((wpDef) => {
      const wpId = getWpId(wpDef);
      const { x, y } = wpPos(wpDef);
      const wp = scene.add.circle(x, y, 10, 0xffffff, 0.3);
      wp.scale = disabledScale;
      wp.setName(wpId);
      wp.setInteractive();
      wp.input.hitArea = new Phaser.Geom.Rectangle(-25, -25, 70, 70);
      wp.on("pointerdown", () => {
        if (!(isActiveData.value() && wpHelper(wpDef).getActive().value()))
          return;
        isActiveData.setValue(false);
        const wpsPath = Graph.extractPath(performBfs(), wpId);
        Flow.run(
          scene,
          Flow.sequence(
            startMoveAction,
            ...wpsPath.map(moveAction),
            endMoveAction,
            Flow.call(() => {
              isActiveData.setValue(true);
            }),
          ),
        );
      });
    });
  };

  return {
    placeWps,
    isActive: isActiveData,
  };
};
