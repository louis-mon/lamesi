import Container = Phaser.GameObjects.Container;
import Vector2 = Phaser.Math.Vector2;

export const toWorldPos = (container: Container, pos: Vector2): Vector2 => {
  const res = new Vector2();
  return container
    .getWorldTransformMatrix()
    .transformPoint(pos.x, pos.y, res) as Vector2;
};

export const toLocalPos = (
  container: Container,
  worldPos: Vector2,
): Vector2 => {
  return container.getLocalPoint(worldPos.x, worldPos.y);
};
