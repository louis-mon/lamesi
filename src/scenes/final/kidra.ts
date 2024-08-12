import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import * as _ from "lodash";
import Vector2 = Phaser.Math.Vector2;
import { placeAt } from "/src/helpers/phaser";
import DegToRad = Phaser.Math.DegToRad;
import { finalSceneClass } from "/src/scenes/final/final-defs";

interface LegAngleState {
  thighAngle: number;
  calfAngle: number;
}

interface LegState extends LegAngleState {
  thighObj: Phaser.Physics.Arcade.Image;
  calfObj: Phaser.Physics.Arcade.Image;
}

interface ArmAngleState {
  armBodyAngle: number;
  arm1Arm2Angle: number;
}

interface Kidra extends ArmAngleState {
  head: Phaser.Physics.Arcade.Image;
  body: Phaser.Physics.Arcade.Image;
  arm1: Phaser.Physics.Arcade.Image;
  arm2: Phaser.Physics.Arcade.Image;
  weapon: Phaser.Physics.Arcade.Image;
  leftLeg: LegState;
  rightLeg: LegState;
  pos: Vector2;
  headBodyAngle: number;
  standingFoot: "right" | "left";
  downFoot: boolean;
}

const armBodyPos = new Vector2(76, 50);
const headBodyPos = new Vector2(63, 12);

interface LegDef {
  thighLen: number;
  calfLen: number;
  thighPosInBody: Vector2;
}

const rightLegDef: LegDef = {
  thighLen: 92,
  calfLen: 93,
  thighPosInBody: new Vector2(79, 312),
};
const leftLegDef: LegDef = {
  thighLen: 99,
  calfLen: 98,
  thighPosInBody: new Vector2(32, 300),
};

function computeLegYDiff(def: LegDef, legs: LegAngleState) {
  return def.thighLen + def.calfLen - computeLegYDist(def, legs);
}

function computeLegYDist(def: LegDef, legs: LegAngleState) {
  return (
    def.thighLen * Math.cos(legs.thighAngle) +
    def.calfLen * Math.cos(legs.calfAngle + legs.thighAngle)
  );
}

function computeLegXDist(def: LegDef, legs: LegAngleState) {
  return (
    def.thighLen * Math.sin(legs.thighAngle) +
    def.calfLen * Math.sin(legs.calfAngle + legs.thighAngle)
  );
}

const computeLeftLegAngle = (rightAngles: LegAngleState): LegAngleState => {
  const D = computeLegYDist(rightLegDef, rightAngles);
  const alpha = Math.acos((D - leftLegDef.calfLen) / leftLegDef.thighLen);
  return {
    thighAngle: alpha,
    calfAngle: -alpha,
  };
};

const updateBodyPos = (kidra: Kidra): Flow.PhaserNode =>
  Flow.handlePostUpdate({
    handler: () => () => {
      const yDiffRight = computeLegYDiff(rightLegDef, kidra.rightLeg);
      const yDiffLeft = computeLegYDiff(leftLegDef, kidra.leftLeg);
      const xDiffRight = computeLegXDist(rightLegDef, kidra.rightLeg);
      const xDiffLeft = computeLegXDist(leftLegDef, kidra.leftLeg);

      placeAt(
        kidra.body,
        kidra.pos
          .clone()
          .add(
            new Vector2(
              kidra.downFoot
                ? kidra.standingFoot === "left"
                  ? xDiffLeft
                  : xDiffRight
                : 0,
              kidra.standingFoot === "left" ? yDiffLeft : yDiffRight,
            ),
          ),
      );

      const bodyPos = kidra.body.getTopLeft();

      placeAt(kidra.head, bodyPos.clone().add(headBodyPos));
      kidra.head.rotation = kidra.headBodyAngle;

      placeAt(kidra.arm2, bodyPos.clone().add(armBodyPos));
      kidra.arm2.rotation = kidra.armBodyAngle;
      const arm2Pos = kidra.arm2
        .getWorldTransformMatrix()
        .transformPoint(-149, 0, new Vector2());
      placeAt(kidra.arm1, arm2Pos);
      kidra.arm1.rotation = kidra.arm1Arm2Angle + kidra.arm2.rotation;
      const arm1Pos = kidra.arm1
        .getWorldTransformMatrix()
        .transformPoint(-123, 0, new Vector2());

      placeAt(kidra.weapon, arm1Pos);
      kidra.weapon.rotation = kidra.arm1.rotation - Math.PI / 2;

      function placeLeg(def: LegDef, state: LegState) {
        placeAt(state.thighObj, bodyPos.clone().add(def.thighPosInBody));
        state.thighObj.rotation = state.thighAngle;
        const leftLegEndPos = state.thighObj
          .getWorldTransformMatrix()
          .transformPoint(0, def.thighLen, new Vector2());
        placeAt(state.calfObj, leftLegEndPos);
        state.calfObj.rotation = state.thighObj.rotation + state.calfAngle;
      }

      placeLeg(leftLegDef, kidra.leftLeg);
      placeLeg(rightLegDef, kidra.rightLeg);
    },
  });

export const kidraFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  const leftThigh = scene.physics.add
    .image(0, 0, "kidra-left-leg")
    .setDisplayOrigin(34, 11);
  const leftCalf = scene.physics.add
    .image(0, 0, "kidra-left-leg2")
    .setDisplayOrigin(61, 11);
  const rightThigh = scene.physics.add
    .image(0, 0, "kidra-right-leg")
    .setDisplayOrigin(42, 10);
  const rightCalf = scene.physics.add
    .image(0, 0, "kidra-right-leg2")
    .setDisplayOrigin(54, 11);
  const body = scene.physics.add.image(0, 0, "kidra-body");
  const head = scene.physics.add
    .image(0, 0, "kidra-head")
    .setDisplayOrigin(114, 144);
  const weapon = scene.physics.add.image(0, 0, "kidra-weapon");
  const arm2 = scene.physics.add.image(0, 0, "kidra-arm2").setOrigin(1, 0.5);
  const arm1 = scene.physics.add
    .image(0, 0, "kidra-arm1")
    .setDisplayOrigin(129, 33);
  const standingLeftAngle: LegAngleState = {
    thighAngle: DegToRad(15),
    calfAngle: DegToRad(-10),
  };
  const standingRightAngle: LegAngleState = {
    thighAngle: DegToRad(0),
    calfAngle: DegToRad(-20),
  };

  const armStartAngle = {
    arm1Arm2Angle: DegToRad(55),
    armBodyAngle: DegToRad(-45),
  };
  const kidra: Kidra = {
    leftLeg: {
      calfObj: leftCalf,
      thighObj: leftThigh,
      ...standingLeftAngle,
    },
    rightLeg: {
      calfObj: rightCalf,
      thighObj: rightThigh,
      ...standingRightAngle,
    },
    ...armStartAngle,
    arm1,
    arm2,
    weapon,
    head,
    body,
    headBodyAngle: 0,
    pos: new Vector2(2250, 500),
    standingFoot: "right",
    downFoot: false,
  };

  const walkSpeed = 400;

  const tweenRightLeg = ({
    angles,
    ...rest
  }: { angles: LegAngleState } & Omit<
    Phaser.Types.Tweens.TweenBuilderConfig,
    "targets"
  >) =>
    Flow.tween({
      targets: kidra.rightLeg,
      props: angles as any,
      ease: Phaser.Math.Easing.Cubic.Out,
      ...rest,
    });

  const tweenLeftLeg = ({
    angles,
    ...rest
  }: { angles: LegAngleState } & Omit<
    Phaser.Types.Tweens.TweenBuilderConfig,
    "targets"
  >) =>
    Flow.tween({
      targets: kidra.leftLeg,
      props: angles as any,
      ease: Phaser.Math.Easing.Cubic.Out,
      ...rest,
    });

  const tweenLegs = ({
    right,
    left,
    ...rest
  }: { left: LegAngleState; right: LegAngleState } & Omit<
    Phaser.Types.Tweens.TweenBuilderConfig,
    "targets"
  >) =>
    Flow.parallel(
      tweenRightLeg({ angles: right, ...rest }),
      tweenLeftLeg({ angles: left, ...rest }),
    );

  const rightLegDownAngles: LegAngleState = {
    thighAngle: DegToRad(-20),
    calfAngle: DegToRad(-40),
  };
  const stepForward = Flow.sequence(
    Flow.call(() => {
      kidra.standingFoot = "right";
    }),
    tweenLegs({
      right: standingRightAngle,
      left: standingLeftAngle,
      duration: 100,
    }),
    tweenLegs({
      right: {
        thighAngle: DegToRad(0),
        calfAngle: DegToRad(0),
      },
      left: {
        thighAngle: DegToRad(110),
        calfAngle: DegToRad(-110),
      },
      duration: walkSpeed,
    }),
    Flow.call(() => {
      kidra.downFoot = true;
    }),
    Flow.parallel(
      tweenLegs({
        right: rightLegDownAngles,
        left: computeLeftLegAngle(rightLegDownAngles),
        duration: walkSpeed,
      }),
      Flow.sequence(
        Flow.waitTimer(walkSpeed / 2),
        Flow.call(() => scene.cameras.main.shake(400, 0.02)),
      ),
    ),
    Flow.call(() => {
      kidra.standingFoot = "left";
      kidra.pos.x = kidra.body.x - computeLegXDist(leftLegDef, kidra.leftLeg);
    }),
    tweenLegs({
      right: {
        thighAngle: DegToRad(30),
        calfAngle: DegToRad(-50),
      },
      left: {
        thighAngle: 0,
        calfAngle: 0,
      },
      duration: walkSpeed,
    }),
    tweenLegs({
      right: standingRightAngle,
      left: standingLeftAngle,
      duration: 100,
    }),
    Flow.call(() => {
      kidra.standingFoot = "right";
      kidra.downFoot = false;
      kidra.pos.x = kidra.body.x;
    }),
  );
  const walk: Flow.PhaserNode = Flow.sequence(
    ..._.range(4).map(() => stepForward),
  );

  const breathing: Flow.PhaserNode = Flow.parallel(
    tweenLegs({
      left: {
        thighAngle: DegToRad(20),
        calfAngle: DegToRad(-20),
      },
      right: {
        thighAngle: DegToRad(5),
        calfAngle: DegToRad(-30),
      },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      repeatDelay: 1000,
    }),
  );

  const tweenKidra = ({
    props,
    ...rest
  }: { props: Partial<Kidra> } & Omit<
    Phaser.Types.Tweens.TweenBuilderConfig,
    "targets" | "props"
  >) =>
    Flow.tween({
      targets: kidra,
      props: props as any,
      ...rest,
    });

  const weaponAboveHead = ({ duration }: { duration: number }) =>
    tweenKidra({
      props: { armBodyAngle: DegToRad(40), arm1Arm2Angle: DegToRad(110) },
      duration,
    });

  const fastWeaponMove = 150;
  const weaponAboveHeadFast = weaponAboveHead({ duration: fastWeaponMove });

  const shakeWeapon: Flow.PhaserNode = Flow.sequence(
    tweenKidra({
      props: armStartAngle,
      duration: 100,
    }),
    weaponAboveHead({ duration: 600 }),
    tweenKidra({
      props: { armBodyAngle: DegToRad(30), arm1Arm2Angle: DegToRad(65) },
      duration: fastWeaponMove,
    }),
    weaponAboveHeadFast,
    tweenKidra({
      props: { armBodyAngle: DegToRad(40), arm1Arm2Angle: DegToRad(78) },
      duration: fastWeaponMove,
    }),
    weaponAboveHeadFast,
    tweenKidra({
      props: { armBodyAngle: DegToRad(30), arm1Arm2Angle: DegToRad(65) },
      duration: fastWeaponMove,
    }),
    weaponAboveHeadFast,
    tweenKidra({
      props: { armBodyAngle: DegToRad(40), arm1Arm2Angle: DegToRad(58) },
      duration: fastWeaponMove,
    }),
    tweenKidra({
      props: armStartAngle,
      duration: 600,
    }),
  );

  return Flow.parallel(
    Flow.sequence(
      walk,
      Flow.call(finalSceneClass.events.enterKidraDone.emit({})),
      Flow.parallel(breathing, shakeWeapon),
    ),
    updateBodyPos(kidra),
  );
});
