import * as Phaser from "phaser";

export type ManipulableObject = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform &
  Phaser.GameObjects.Components.AlphaSingle &
  Phaser.GameObjects.Components.Depth;
