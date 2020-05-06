import Phaser from "phaser";

export class FakeScene extends Phaser.Scene {
  constructor() {
    super({ key: "fake" });
  }
  preload() {
    this.load.image("ball", "src/assets/ball.png");
  }
  create() {
    const ball = this.physics.add
      .image(0, 0, "ball")
      .setCollideWorldBounds(true, undefined, 1);
    ball.setInteractive();
    ball.on("pointerdown", () => {
      this.tweens.add({
        targets: ball,
        props: { scale: 2 },
        duration: 200,
        loop: 5,
        yoyo: true
      });
    });
  }
}
