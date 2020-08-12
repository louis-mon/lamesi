import {
  commonGoEvents,
  declareGoInstance,
  defineGoClass,
} from "/src/helpers/component";
import * as Geom from "/src/helpers/math/geom";
import * as Graph from "/src/helpers/math/graph";
import { createImageAt, SceneContext } from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { annotate } from "/src/helpers/typing";
import _ from "lodash";
import * as Phaser from "phaser";
import { combineLatest } from "rxjs";
import { auditTime, map } from "rxjs/operators";
import { gameHeight, gameWidth } from "../common";
import { menuZoneSize } from "../menu";
import * as Def from "./definitions";
import { WpDef, WpGraph, WpId } from "./definitions";

export { WpId, WpDef } from "./definitions";

import Vector2 = Phaser.Math.Vector2;

export const declareWpId = (id: string) => id as WpId;
export const getWpId = ({ room, x, y }: WpDef): WpId =>
  declareWpId(`wp-${room}-${x}-${y}`);

const roomSize = new Vector2(530, 400);
const roomMargin = new Vector2(60, 55);
const wpPerSide = 5;
export const wpSize = roomSize.clone().scale(1 / wpPerSide);
export const wpHalfSize = wpSize.clone().scale(0.5);
const scenePos = new Vector2(menuZoneSize + 20, 100);
const nbRoomsW = 3;
const nbRoomsH = 2;
const nbRooms = nbRoomsW * nbRoomsH;

const getRoomPos = (room: number) => Phaser.Math.ToXY(room, nbRoomsW, nbRoomsH);

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

const allWp: WpDef[] = _.flatMap(_.range(nbRooms), (i) =>
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
    links: (open ? _.union : _.difference)(graph[wp1].links, [wp2]),
  },
  [wp2]: {
    ...graph[wp1],
    links: (open ? _.union : _.difference)(graph[wp2].links, [wp1]),
  },
});

const setGraphLinkData = ({
  wp1,
  wp2,
  open,
}: WpLink & {
  open: boolean;
}): SceneContext<void> =>
  Def.scene.data.wpGraph.updateValue((graph) =>
    setGraphLink(graph, wp1, wp2, open),
  );

type ObstacleKind = "none" | "wall" | "spike";
export const setGroundObstacleLink = ({
  wp1,
  wp2,
  kind,
}: WpLink & {
  kind: ObstacleKind;
}): SceneContext<void> => (scene) => {
  const wpGraph = Def.scene.data.wpGraph.value(scene);
  if (!wpGraph[wp1] || !wpGraph[wp2]) {
    return;
  }
  const open = kind === "none";
  setGraphLinkData({ wp2, wp1, open })(scene);
  const wpDef1 = getWpDef(wp1);
  const wpDef2 = getWpDef(wp2);
  const pos = wpPos(wpDef1).add(wpPos(wpDef2)).scale(0.5);
  const sameXCoord = wpDef1.x === wpDef2.x;
  const key = _.sortBy([wp1, wp2]).join("--");
  const oldObj = scene.children.getByName(key);
  if (kind === "spike" && !oldObj) {
    createImageAt(scene, pos, "npc", sameXCoord ? "spikes-h" : "spikes-v")
      .setDepth(Def.depths.npc)
      .setName(key);
  } else if (kind === "wall" && !oldObj) {
    const wall =
      wpDef1.room === wpDef2.room
        ? createImageAt(scene, pos, "npc", sameXCoord ? "wall-h" : "wall-v")
            .setDepth(Def.depths.npc)
            .setName(key)
        : scene.add
            .zone(
              pos.x,
              pos.y,
              sameXCoord ? wpHalfSize.x * 2 : roomMargin.x,
              sameXCoord ? roomMargin.y : wpHalfSize.y * 2,
            )
            .setName(key);
    Def.scene.data.wallGroup.value(scene).add(wall);
  } else if (kind === "none" && oldObj) {
    oldObj.destroy();
  }
};

export const setGroundObstacleLine = ({
  line,
  kind,
  room,
}: {
  line: Phaser.Geom.Line;
  room: number;
  kind: ObstacleKind;
}): SceneContext<void> => (scene) => {
  const points = line.getPoints(0, 1);
  const norm = new Vector2(line.getPointA())
    .subtract(new Vector2(line.getPointB()))
    .normalizeLeftHand()
    .normalize();
  points.forEach(({ x, y }) => {
    setGroundObstacleLink({
      wp1: getWpId({ room, x: x - Math.abs(norm.x), y: y - Math.abs(norm.y) }),
      wp2: getWpId({ room, x, y }),
      kind,
    })(scene);
  });
};

export const setGroundObstacleRect = ({
  wp1,
  wp2,
  kind,
  room,
}: {
  wp1: Phaser.Types.Math.Vector2Like;
  wp2: Phaser.Types.Math.Vector2Like;
  room: number;
  kind: ObstacleKind;
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
      kind,
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
  Def.scene.data.wpGraph.setValue(initialWpGraph())(scene);

  const bounds = roomSize
    .clone()
    .multiply(new Vector2(nbRoomsW, nbRoomsH))
    .add(roomMargin.clone().multiply(new Vector2(nbRoomsW - 1, nbRoomsH - 1)))
    .add(scenePos);
  const addBoundWall = (rect: Phaser.Geom.Rectangle) => {
    const wall = scene.add
      .zone(rect.x, rect.y, rect.width, rect.height)
      .setOrigin(0, 0);
    Def.scene.data.wallGroup.value(scene).add(wall);
  };
  [
    new Phaser.Geom.Rectangle(0, 0, scenePos.x, gameHeight),
    new Phaser.Geom.Rectangle(bounds.x, 0, gameWidth - bounds.x, gameHeight),
    new Phaser.Geom.Rectangle(scenePos.x, 0, bounds.x - scenePos.x, scenePos.y),
    new Phaser.Geom.Rectangle(
      scenePos.x,
      bounds.y,
      bounds.x - scenePos.x,
      gameHeight - bounds.y,
    ),
  ].map(addBoundWall);
  _.range(nbRooms / 2).forEach((room) => {
    _.range(wpPerSide).forEach((x) => {
      setGroundObstacleLink({
        kind: x === 2 ? "none" : "wall",
        wp1: getWpId({ room, x, y: wpPerSide - 1 }),
        wp2: getWpId({ room: room + nbRooms / 2, x, y: 0 }),
      })(scene);
    });
  });
  [0, 1, 3, 4].forEach((room) => {
    _.range(wpPerSide).forEach((y) => {
      setGroundObstacleLink({
        kind: y === 2 ? "none" : "wall",
        wp1: getWpId({ room, x: wpPerSide - 1, y }),
        wp2: getWpId({ room: room + 1, x: 0, y }),
      })(scene);
    });
  });
  // room 1
  setGroundObstacleLine({
    line: new Phaser.Geom.Line(4, 2, 4, 4),
    kind: "wall",
    room: 1,
  })(scene);
  setGroundObstacleLine({
    line: new Phaser.Geom.Line(3, 4, 4, 4),
    kind: "wall",
    room: 1,
  })(scene);
  // room 2
  setGroundObstacleLine({
    line: new Phaser.Geom.Line(2, 0, 2, 5),
    kind: "wall",
    room: 2,
  })(scene);
  setGroundObstacleLine({
    line: new Phaser.Geom.Line(1, 4, 2, 4),
    kind: "wall",
    room: 2,
  })(scene);
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
  const skillPointerActive = Def.scene.data.skillPointerActive;
  const wpGraphData = Def.scene.data.wpGraph;
  const currentPosData = Def.player.data.currentPos;

  const performBfs = () =>
    Graph.bfs({
      graph: { links: (v) => wpGraphData.value(scene)[v].links },
      startPoint: currentPosData.value(scene),
    });

  skillPointerActive.setValue(false)(scene);

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
      wpGraphData.dataSubject(scene),
      currentPosData.dataSubject(scene),
    ]).pipe(
      auditTime(50),
      map(() => {
        const getActiveWpIds = (): WpId[] =>
          _.keys(performBfs().paths) as WpId[];
        const activeWpIds = getActiveWpIds();
        const inactiveWps = _.difference(
          _.keys(allWpById),
          activeWpIds,
        ) as WpId[];
        return Flow.parallel(
          ...activeWpIds.map((wpId) =>
            toggleWp({ wpDef: getWpDef(wpId), isActive: true }),
          ),
          ...inactiveWps.map((wpId) =>
            toggleWp({ wpDef: getWpDef(wpId), isActive: false }),
          ),
        );
      }),
    ),
  );

  const wpsFlow = allWp.map((wpDef) => {
    const wpId = getWpId(wpDef);
    return Flow.observe(commonGoEvents.pointerdown(wpId).subject, () =>
      Flow.call(Def.scene.events.clickWp.emit(wpId)),
    );
  });

  const clickWp = Flow.observeSentinel(
    Def.scene.events.clickWp.subject,
    (wpId) => {
      return Flow.sequence(
        Flow.call(Def.scene.data.movePlayerCanceled.setValue(true)),
        Flow.when({
          condition: Def.player.data.isMoving
            .dataSubject(scene)
            .pipe(map((x) => !x)),
          action: Flow.lazy(() => {
            const isSkillActive = skillPointerActive.value(scene);
            if (isSkillActive || !wpClass.data.isActive(wpId).value(scene))
              return Flow.noop;
            const wpsPath = Graph.extractPath(performBfs(), wpId);
            return Flow.call(
              Def.scene.events.movePlayer.emit({ path: wpsPath }),
            );
          }),
        }),
      );
    },
  );

  return Flow.parallel(computeWps, clickWp, ...wpsFlow);
});
