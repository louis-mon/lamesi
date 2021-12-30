import Vector2 = Phaser.Math.Vector2;

export type LegFlowParams = {
  startPos: Vector2;
  startAngle: number;
  flip?: boolean;
  requiredSlot: number;
};

const firstLevelAngle = -Math.PI / 10;
const secondLevelAngle = 0;
const thirdLevelAngle = Math.PI / 8;

export const legsConfigBySlot: {
  [key: number]: Omit<LegFlowParams, "startPos" | "requiredSlot">;
} = {
  0: {
    startAngle: Math.PI - firstLevelAngle,
    flip: true,
  },
  3: { startAngle: firstLevelAngle },
  1: {
    startAngle: Math.PI - secondLevelAngle,
    flip: false,
  },
  4: { startAngle: secondLevelAngle, flip: true },
  2: { startAngle: Math.PI - thirdLevelAngle },
  5: { startAngle: thirdLevelAngle, flip: true },
};

export const legsSwingDuration = 800;
