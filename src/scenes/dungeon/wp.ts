import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import * as Graph from "/src/helpers/math/graph";
import * as Geom from "/src/helpers/math/geom";
import * as Def from "./definitions";
import { WpId, WpDef, WpGraph } from "./definitions";
export { WpId, WpDef } from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import _ from "lodash";
import { menuZoneSize } from "../menu";
import { combineLatest } from "rxjs";
import { auditTime, map, tap } from "rxjs/operators";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  commonGoEvents,
} from "/src/helpers/component";
import { combineContext } from "/src/helpers/functional";

export const declareWpId = (id: string) => id as WpId;
export const getWpId = ({ room, x, y }: WpDef): WpId =>
  declareWpId(`wp-${room}-${x}-${y}`);

const roomSize = new Vector2(530, 400);
const roomMargin = new Vector2(60, 55);
const roomPadding = new Vector2(45, 30);
const scenePos = new Vector2(menuZoneSize + 20, 100);
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
            .multiply(roomSize.clone().subtract(roomPadding.clone().scale(2)))
            .scale(1 / 4),
        ),
    );
};

export type WpsActionParams = {
  moveAction: (newWp: WpId) => Flow.PhaserNode;
  startMoveAction: Flow.PhaserNode;
  endMoveAction: Flow.PhaserNode;
};

const RoomRectangle = new Phaser.Geom.Rectangle(0, 0, 4, 4);

const allWp: WpDef[] = _.flatMap(_.range(6), (i) =>
  _.range(25).map((posI) => ({ ...Phaser.Math.ToXY(posI, 5, 5), room: i })),
);
const allWpById = _.keyBy(allWp, getWpId);

export const getWpDef = (id: WpId): WpDef => allWpById[id];

const initialWpGraph = (): WpGraph => {
  return _.mapValues(allWpById, (wp, id) => ({
    links: Geom.pointsAround(new Vector2(wp), 1)
      .filter(({ x, y }) => RoomRectangle.contains(x, y))
      .map(({ x, y }) => getWpId({ room: wp.room, x, y })),
  }));
};

const setGraphLink = (
  graph: WpGraph,
  wp1: WpId,
  wp2: WpId,
  open: boolean,
): WpGraph => ({
  ...graph,
  [wp1]: {
    ...graph[wp1],
    links: (open === true ? _.union : _.difference)(graph[wp1].links, [wp2]),
  },
  [wp2]: {
    ...graph[wp1],
    links: (open === true ? _.union : _.difference)(graph[wp2].links, [wp1]),
  },
});

export const setGraphLinkData = ({
  wp1,
  wp2,
  open,
}: {
  wp1: WpId;
  wp2: WpId;
  open: boolean;
}) => (scene: Phaser.Scene) => {
  Def.scene.data.wpGraph.updateValue((graph) =>
    setGraphLink(graph, wp1, wp2, open),
  )(scene);
};

const disabledScale = 0.2;

const wpClass = defineGoClass({
  events: {},
  data: { isActive: annotate<boolean>() },
});
const declareWp = (wp: WpDef) => declareGoInstance(wpClass, getWpId(wp));

export const placeWps = (scene: Phaser.Scene) => {
  scene.add.image(0, 0, "rooms").setDepth(Def.depths.backgound).setOrigin(0, 0);
  allWp.forEach((wpDef) => {
    const wpId = getWpId(wpDef);
    const { x, y } = wpPos(wpDef);
    const wp = scene.add
      .circle(x, y, 10, 0xffffff, 0.3)
      .setDepth(Def.depths.wp)
      .setDataEnabled()
      .setScale(disabledScale)
      .setName(wpId)
      .setInteractive();
    wp.input.hitArea = new Phaser.Geom.Rectangle(-25, -25, 70, 70);
  });
};

export const wpsAction: Flow.PhaserNode = Flow.lazy((scene) => {
  const isActiveData = Def.scene.data.isWpActive;
  const wpGraphData = Def.scene.data.wpGraph;
  const currentPosData = Def.player.data.currentPos;

  const performBfs = () =>
    Graph.bfs({
      graph: { links: (v) => wpGraphData.value(scene)[v].links },
      startPoint: currentPosData.value(scene),
    });

  isActiveData.setValue(true)(scene);
  wpGraphData.setValue(initialWpGraph())(scene);

  const computeWps = Flow.observe(
    combineLatest([
      isActiveData.dataSubject(scene),
      wpGraphData.dataSubject(scene),
      currentPosData.dataSubject(scene),
    ]).pipe(
      auditTime(50),
      map(([isActive]) => {
        const toggleWp = ({
          wpDef,
          scale,
        }: {
          scale: number;
          wpDef: WpDef;
        }) => {
          const wpObjDef = declareWp(wpDef);
          return Flow.sequence(
            Flow.tween({
              targets: wpObjDef.getObj(scene),
              props: { scale },
              duration: 200,
            }),
            Flow.call(wpObjDef.data.isActive.setValue(isActive)),
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
            ...allWp.map((wpDef) => toggleWp({ wpDef, scale: disabledScale })),
          );
        }
      }),
    ),
  );

  const wpsFlow = allWp.map((wpDef) => {
    const wpId = getWpId(wpDef);
    return Flow.observe(commonGoEvents.pointerdown(wpId).subject, () => {
      if (!wpClass.data.isActive(wpId).value(scene)) return Flow.noop;
      const wpsPath = Graph.extractPath(performBfs(), wpId);
      return Flow.call(Def.scene.events.movePlayer.emit({ path: wpsPath }));
    });
  });

  return Flow.parallel(computeWps, ...wpsFlow);
});
