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
import { auditTime, map } from "rxjs/operators";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  commonGoEvents,
} from "/src/helpers/component";
import { SceneContext, createImageAt } from "/src/helpers/phaser";

export const declareWpId = (id: string) => id as WpId;
export const getWpId = ({ room, x, y }: WpDef): WpId =>
  declareWpId(`wp-${room}-${x}-${y}`);

const roomSize = new Vector2(530, 400);
const roomMargin = new Vector2(60, 55);
const wpPerSide = 5;
const wpHalfSize = roomSize.clone().scale(0.5 / wpPerSide);
const scenePos = new Vector2(menuZoneSize + 20, 100);

const getRoomPos = (room: number) => Phaser.Math.ToXY(room, 3, 2);

export const wpPos = (wp: WpDef) => {
  const roomPos = getRoomPos(wp.room);
  return scenePos
    .clone()
    .add(wpHalfSize)
    .add(
      roomPos
        .clone()
        .multiply(roomSize.clone().add(roomMargin))
        .add(
          new Vector2(wp)
            .clone()
            .multiply(roomSize.clone())
            .scale(1 / wpPerSide),
        ),
    );
};

export type WpsActionParams = {
  moveAction: (newWp: WpId) => Flow.PhaserNode;
  startMoveAction: Flow.PhaserNode;
  endMoveAction: Flow.PhaserNode;
};

const RoomRectangle = new Phaser.Geom.Rectangle(
  0,
  0,
  wpPerSide - 1,
  wpPerSide - 1,
);

const allWp: WpDef[] = _.flatMap(_.range(6), (i) =>
  _.range(wpPerSide * wpPerSide).map((posI) => ({
    ...Phaser.Math.ToXY(posI, wpPerSide, wpPerSide),
    room: i,
  })),
);
const allWpById = _.keyBy(allWp, getWpId);

export const getWpDef = (id: WpId): WpDef => allWpById[id];

export type WpLink = { wp1: WpId; wp2: WpId };

export const getWpLink = (room1: number, room2: number): WpLink => {
  const roomPos = {
    [room1]: getRoomPos(room1),
    [room2]: getRoomPos(room2),
  };
  const getCoordinate = (coord: keyof Vector2, from: number, to: number) =>
    roomPos[from][coord] === roomPos[to][coord]
      ? 2
      : roomPos[from][coord] < roomPos[to][coord]
      ? 4
      : 0;
  const getLinkPart = (from: number, to: number) =>
    getWpId({
      room: from,
      x: getCoordinate("x", from, to),
      y: getCoordinate("y", from, to),
    });
  return {
    wp1: getLinkPart(room1, room2),
    wp2: getLinkPart(room2, room1),
  };
};

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
}: WpLink & {
  open: boolean;
}): SceneContext<void> =>
  Def.scene.data.wpGraph.updateValue((graph) =>
    setGraphLink(graph, wp1, wp2, open),
  );

export const getGraphLinkDataBetween = ({
  wp1,
  wp2,
}: WpLink): SceneContext<boolean> => (scene) =>
  Def.scene.data.wpGraph.value(scene)[wp1].links.includes(wp2);

export const setGroundObstacleLink = ({
  wp1,
  wp2,
  open,
}: {
  wp1: WpDef;
  wp2: WpDef;
  open: boolean;
}): SceneContext<void> => (scene) => {
  const wp1Id = getWpId(wp2);
  const wp2Id = getWpId(wp1);
  const wpGraph = Def.scene.data.wpGraph.value(scene);
  if (
    !wpGraph[wp1Id] ||
    !wpGraph[wp2Id] ||
    getGraphLinkDataBetween({ wp1: wp1Id, wp2: wp2Id })(scene) === open
  ) {
    return;
  }
  const pos = wpPos(wp1).add(wpPos(wp2)).scale(0.5);
  const spike = createImageAt(
    scene,
    pos,
    "npc",
    wp1.x === wp2.x ? "spikes-h" : "spikes-v",
  ).setDepth(Def.depths.npc);
  setGraphLinkData({ wp2: wp2Id, wp1: wp1Id, open })(scene);
  Def.scene.data.wallGroup.updateValue((group) => group.add(spike))(scene);
};

export const setGroundObstacleLine = ({
  line,
  open,
  room,
}: {
  line: Phaser.Geom.Line;
  room: number;
  open: boolean;
}): SceneContext<void> => (scene) => {
  const points = line.getPoints(0, 1);
  const norm = new Vector2(line.getPointA())
    .subtract(new Vector2(line.getPointB()))
    .normalizeLeftHand()
    .normalize();
  points.forEach(({ x, y }) => {
    setGroundObstacleLink({
      wp1: { room, x: x - Math.abs(norm.x), y: y - Math.abs(norm.y) },
      wp2: { room, x, y },
      open,
    })(scene);
  });
};

export const setGroundObstacleRect = ({
  wp1,
  wp2,
  open,
  room,
}: {
  wp1: Phaser.Types.Math.Vector2Like;
  wp2: Phaser.Types.Math.Vector2Like;
  room: number;
  open: boolean;
}): SceneContext<void> => (scene) => {
  const { left, right, top, bottom } = Phaser.Geom.Rectangle.FromPoints([
    wp1,
    wp2,
  ]);
  const lines = [
    new Phaser.Geom.Line(left, top, right, top),
    new Phaser.Geom.Line(right, top, right, bottom),
    new Phaser.Geom.Line(left, top, left, bottom),
    new Phaser.Geom.Line(left, bottom, right, bottom),
  ];
  lines.forEach((line) =>
    setGroundObstacleLine({
      line,
      open,
      room,
    })(scene),
  );
};

const disabledScale = 0.2;

const wpClass = defineGoClass({
  events: {},
  data: { isActive: annotate<boolean>() },
});
const declareWp = (wp: WpDef) => declareGoInstance(wpClass, getWpId(wp));

const initWalls: SceneContext<void> = (scene) => {
  const wallGroup = scene.physics.add.staticGroup();
  Def.scene.data.wallGroup.setValue(wallGroup)(scene);
};

export const initGroundMap = (scene: Phaser.Scene) => {
  initWalls(scene);

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

  const toggleWp = ({
    wpDef,
    isActive,
  }: {
    wpDef: WpDef;
    isActive: boolean;
  }) => {
    const wpObjDef = declareWp(wpDef);
    return Flow.sequence(
      Flow.call(wpObjDef.data.isActive.setValue(isActive)),
      Flow.tween({
        targets: wpObjDef.getObj(scene),
        props: { scale: isActive ? 1 : disabledScale },
        duration: 200,
      }),
    );
  };

  const computeWps = Flow.observe(
    combineLatest([
      isActiveData.dataSubject(scene),
      wpGraphData.dataSubject(scene),
      currentPosData.dataSubject(scene),
    ]).pipe(
      auditTime(50),
      map(([isActive]) => {
        const getActiveWpIds = (): WpId[] => {
          if (isActive) return _.keys(performBfs().paths) as WpId[]
          return [];
        }
        const activeWpIds = getActiveWpIds();
        const inactiveWps = _.difference(_.keys(allWpById), activeWpIds) as WpId[];
        return Flow.parallel(
          ...activeWpIds.map(wpId => toggleWp({wpDef: getWpDef(wpId), isActive: true})),
          ...inactiveWps.map(wpId => toggleWp({wpDef: getWpDef(wpId), isActive: false})),
        )
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
