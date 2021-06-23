import * as Phaser from 'phaser';

export class MovedCurve extends Phaser.Curves.Curve {
  private fromCurve: Phaser.Curves.Curve;
  private fromPoint: Phaser.Math.Vector2;

  constructor(fromCurve: Phaser.Curves.Curve, point: Phaser.Math.Vector2) {
    super(fromCurve.type);
    this.fromCurve = fromCurve;
    this.fromPoint = point;
  }
  getPoint(t: number, out?: Phaser.Math.Vector2) {
    return (this.fromCurve as Phaser.Curves.Line).getPoint(t, out)!.add(this.fromPoint);
  }
}
