import * as Phaser from "phaser";

import Vector2 = Phaser.Math.Vector2;

const cardinals = [Vector2.LEFT, Vector2.UP, Vector2.RIGHT, Vector2.DOWN];
export const pointsAround = (v: Vector2, dist: number) =>
  cardinals.map((c) => c.clone().scale(dist).add(v));
