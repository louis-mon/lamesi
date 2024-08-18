import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import * as _ from "lodash";
import Vector2 = Phaser.Math.Vector2;
import { getObjectPosition, placeAt } from "/src/helpers/phaser";
import DegToRad = Phaser.Math.DegToRad;
import {
  finalSceneClass,
  Kidra,
  LegAngleState,
  LegState,
} from "/src/scenes/final/final-defs";
import { weakPointEffect } from "/src/helpers/animate/tween/tween-color";
import { BehaviorSubject } from "rxjs";

const armBodyPos = new Vector2(10, -110);
const headBodyPos = new Vector2(-3, -148);

interface LegDef {
  thighLen: number;
  calfLen: number;
  thighPosInBody: Vector2;
}

const rightLegDef: LegDef = {
  thighLen: 92,
  calfLen: 93,
  thighPosInBody: new Vector2(13, 152),
};
const leftLegDef: LegDef = {
  thighLen: 99,
  calfLen: 98,
  thighPosInBody: new Vector2(-34, 140),
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

function placeRelativeToJoint({
  target,
  parent,
  pos,
  angle,
}: {
  target: Phaser.GameObjects.Components.Transform;
  parent: Phaser.GameObjects.Components.Transform;
  angle: number;
  pos: Vector2;
}) {
  const parentPos = parent
    .getWorldTransformMatrix()
    .transformPoint(pos.x, pos.y, new Vector2());

  placeAt(target, parentPos);
  target.rotation = angle + parent.rotation;
}

/** relative to top left, not display origin */
function wordPositionInObjectFromTL({
  target,
  localPos,
}: {
  target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.Components.Origin;
  localPos: Vector2;
}): Vector2 {
  return target
    .getWorldTransformMatrix()
    .transformPoint(
      localPos.x - target.displayOriginX,
      localPos.y - target.displayOriginY,
      new Vector2(),
    ) as Vector2;
}

const updateBodyPos = (kidra: Kidra): Flow.PhaserNode =>
  Flow.handlePostUpdate({
    handler: () => () => {
      const yDiffRight = computeLegYDiff(rightLegDef, kidra.rightLeg);
      const yDiffLeft = computeLegYDiff(leftLegDef, kidra.leftLeg);
      const xDiffRight = computeLegXDist(rightLegDef, kidra.rightLeg);
      const xDiffLeft = computeLegXDist(leftLegDef, kidra.leftLeg);

      const xDiff = { right: xDiffRight, left: xDiffLeft };
      const yDiff = { right: yDiffRight, left: yDiffLeft };

      placeAt(
        kidra.body,
        kidra.pos
          .clone()
          .add(
            new Vector2(
              kidra.downFoot ? xDiff[kidra.standingFoot!] ?? 0 : 0,
              yDiff[kidra.standingFoot!] ?? 0,
            ),
          ),
      );
      kidra.body.rotation = kidra.bodyAngle;

      placeRelativeToJoint({
        target: kidra.head,
        parent: kidra.body,
        pos: headBodyPos,
        angle: kidra.headBodyAngle,
      });

      placeRelativeToJoint({
        target: kidra.arm2,
        parent: kidra.body,
        pos: armBodyPos,
        angle: kidra.armBodyAngle,
      });

      placeRelativeToJoint({
        target: kidra.arm1,
        parent: kidra.arm2,
        pos: new Vector2(-149, 0),
        angle: kidra.arm1Arm2Angle,
      });

      if (kidra.weaponAttached) {
        placeRelativeToJoint({
          target: kidra.weapon,
          parent: kidra.arm1,
          pos: new Vector2(-123, 0),
          angle: -Math.PI / 2,
        });
      }

      function placeLeg(def: LegDef, state: LegState) {
        placeRelativeToJoint({
          target: state.thighObj,
          parent: kidra.body,
          pos: def.thighPosInBody,
          angle: state.thighAngle,
        });
        placeRelativeToJoint({
          target: state.calfObj,
          parent: state.thighObj,
          pos: new Vector2(0, def.thighLen),
          angle: state.calfAngle,
        });
      }

      placeLeg(leftLegDef, kidra.leftLeg);
      placeLeg(rightLegDef, kidra.rightLeg);
    },
  });

const initialHeadBodyAngle = 0;

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

export const kidraFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  const leftThigh = scene.add
    .image(0, 0, "kidra-left-leg")
    .setDisplayOrigin(34, 11);
  const leftCalf = scene.add
    .image(0, 0, "kidra-left-leg2")
    .setDisplayOrigin(61, 11);
  const rightThigh = scene.add
    .image(0, 0, "kidra-right-leg")
    .setDisplayOrigin(42, 10);
  const rightCalf = scene.add
    .image(0, 0, "kidra-right-leg2")
    .setDisplayOrigin(54, 11);
  const body = scene.add.image(0, 0, "kidra-body");
  const head = scene.physics.add
    .image(0, 0, "kidra-head")
    .setDisplayOrigin(114, 144)
    .setImmovable();
  const weapon = scene.add.image(0, 0, "kidra-weapon");
  const arm2 = scene.add.image(0, 0, "kidra-arm2").setOrigin(1, 0.5);
  const arm1 = scene.add.image(0, 0, "kidra-arm1").setDisplayOrigin(129, 33);
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
    bodyAngle: 0,
    headBodyAngle: initialHeadBodyAngle,
    pos: new Vector2(2250, 500),
    //pos: new Vector2(1600, 500),
    standingFoot: "right",
    downFoot: false,
    battleState: Flow.makeSceneStates(),
    headState: Flow.makeSceneStates(),
    legsState: Flow.makeSceneStates(),
    hitCount: 0,
    weaponAttached: true,
  };
  finalSceneClass.data.kidra.setValue(kidra)(scene);
  finalSceneClass.data.lightBalls.setValue(scene.physics.add.group())(scene);

  const { stepForward } = makeAnims(kidra);

  const walk: Flow.PhaserNode = Flow.sequence(
    ..._.range(4).map(() => stepForward),
    //..._.range(1).map(() => stepForward),
  );

  return Flow.parallel(
    Flow.sequence(
      walk,
      Flow.call(finalSceneClass.events.enterKidraDone.emit({})),
      Flow.parallel(
        kidra.headState.start(),
        kidra.legsState.start(),
        kidra.battleState.start(kidraWaitingState),
      ),
    ),
    updateBodyPos(kidra),
  );
});

function makeAnims(kidra: Kidra) {
  const walkSpeed = 400;

  const tweenRightLeg = ({
    angles,
    ...rest
  }: { angles: Partial<LegAngleState> } & Omit<
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
  }: { angles: Partial<LegAngleState> } & Omit<
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
  }: { left: Partial<LegAngleState>; right: Partial<LegAngleState> } & Omit<
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
  const resetLegs = tweenLegs({
    right: standingRightAngle,
    left: standingLeftAngle,
    duration: 100,
  });
  const stepForward = Flow.sequence(
    Flow.call(() => {
      kidra.standingFoot = "right";
    }),
    resetLegs,
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
        Flow.call((scene) => scene.cameras.main.shake(400, 0.02)),
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
    resetLegs,
    Flow.call(() => {
      kidra.standingFoot = "right";
      kidra.downFoot = false;
      kidra.pos.x = kidra.body.x;
    }),
  );

  const breathing: Flow.PhaserNode = Flow.sequence(
    resetLegs,
    Flow.repeat(
      Flow.lazy(() =>
        Flow.sequence(
          tweenLegs({
            left: {
              thighAngle: DegToRad(20),
              calfAngle: DegToRad(-20),
            },
            right: {
              thighAngle: DegToRad(5),
              calfAngle: DegToRad(-30),
            },
            duration: 1000 - kidra.hitCount * 300,
            yoyo: true,
          }),
          Flow.waitTimer(1000 - kidra.hitCount * 300),
        ),
      ),
    ),
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

  const slashWeapon: Flow.PhaserNode = Flow.sequence(
    tweenKidra({
      props: armStartAngle,
      duration: 2,
    }),
    tweenKidra({
      props: { armBodyAngle: DegToRad(80), arm1Arm2Angle: DegToRad(60) },
      duration: 300,
    }),
    tweenKidra({
      props: armStartAngle,
      duration: 300,
    }),
  );

  return {
    shakeWeapon,
    stepForward,
    slashWeapon,
    breathing,
    startBreath: kidra.legsState.nextFlow(breathing),
    stopBreath: kidra.legsState.nextFlow(Flow.noop),
    tweenKidra,
    tweenLegs,
    tweenLeftLeg,
    tweenRightLeg,
  };
}

function getKidra(scene: Phaser.Scene) {
  return finalSceneClass.data.kidra.value(scene);
}

const kidraWaitingState: Flow.PhaserNode = Flow.lazy((scene) => {
  const kidra = getKidra(scene);

  const anims = makeAnims(kidra);
  return Flow.parallel(
    anims.startBreath,
    anims.shakeWeapon,
    Flow.whenValueDo({
      condition: Flow.arcadeColliderSubject({
        object1: finalSceneClass.data.lightBalls.value(scene),
        object2: kidra.head,
      }),
      action: () =>
        Flow.sequence(
          Flow.call(finalSceneClass.events.destroyBall.emit({ respawn: true })),
          kidra.headState.nextFlow(
            weakPointEffect({
              target: kidra.head,
              duration: 1500 - kidra.hitCount * 400,
            }),
          ),
          Flow.tween({
            targets: kidra,
            props: { headBodyAngle: Math.PI / 6 },
            ease: Phaser.Math.Easing.Elastic.Out,
          }),
          Flow.tween({
            targets: kidra,
            props: { headBodyAngle: initialHeadBodyAngle },
            ease: Phaser.Math.Easing.Cubic.Out,
          }),
          Flow.call(() => {
            ++kidra.hitCount;
          }),
          anims.stopBreath,
          anims.stepForward,
          kidra.battleState.nextFlow(kidraDefendState),
        ),
    }),
  );
});

const kidraDefendState: Flow.PhaserNode = Flow.lazy((scene) => {
  const kidra = getKidra(scene);
  const anims = makeAnims(kidra);
  const zone = scene.add.zone(0, 0, 600, 600);
  const collideZone = scene.physics.add.existing(
    zone,
  ) as unknown as Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody;
  collideZone.body.setImmovable(true);
  let tries = 0;
  return Flow.withCleanup({
    flow: Flow.parallel(
      anims.startBreath,
      Flow.onPostUpdate(
        () => () => placeAt(zone, getObjectPosition(kidra.head)),
      ),
      Flow.observeO({
        condition: Flow.arcadeColliderSubject({
          object1: finalSceneClass.data.lightBalls.value(scene),
          object2: collideZone,
        }),
        action: () =>
          Flow.lazy(() => {
            ++tries;
            const charged =
              finalSceneClass.data.lightBallCharge.value(scene) >= 1;
            return Flow.sequence(
              Flow.call(
                finalSceneClass.events.destroyBall.emit({ respawn: !charged }),
              ),
              charged
                ? kidra.battleState.nextFlow(kidraKillingState)
                : Flow.sequence(
                    anims.slashWeapon,
                    Flow.call(finalSceneClass.events.ghostAppear.emit({})),
                  ),
            );
          }),
      }),
    ),
    cleanup: () => collideZone.destroy(),
  });
});

const kidraKillingState: Flow.PhaserNode = Flow.lazy((scene) => {
  const kidra = getKidra(scene);
  const anims = makeAnims(kidra);
  kidra.weaponAttached = false;
  const floor = 924;
  const fallen = new BehaviorSubject(false);
  const headCenter = () =>
    wordPositionInObjectFromTL({
      target: kidra.head,
      localPos: new Vector2(135, 73),
    });

  const weaponFall = Flow.sequence(
    Flow.withBackground({
      main: Flow.tween({
        targets: kidra.weapon,
        props: { y: -500 },
        duration: 1000,
      }),
      back: Flow.tween({
        targets: kidra.weapon,
        props: { rotation: Math.PI * 30 },
      }),
    }),
    Flow.waitTrue(fallen),
    Flow.call(() => {
      kidra.weapon.x = headCenter().x;
      kidra.weapon.angle = -90;
    }),
    Flow.tween(() => ({
      targets: kidra.weapon,
      props: {
        y: headCenter().y - kidra.weapon.displayWidth / 2,
      },
      duration: 800,
      ease: Phaser.Math.Easing.Quadratic.In,
    })),
    Flow.parallel(
      Flow.sequence(
        anims.tweenKidra({
          props: { armBodyAngle: DegToRad(-90) },
          duration: 700,
        }),
        anims.tweenKidra({
          props: { arm1Arm2Angle: DegToRad(0) },
          duration: 700,
        }),
      ),
      Flow.sequence(
        anims.tweenLegs({
          right: { thighAngle: 0, calfAngle: 0 },
          left: { thighAngle: 0, calfAngle: 0 },
          duration: 700,
        }),
      ),
    ),
    Flow.call(finalSceneClass.events.kidraDead.emit({})),
  );
  const bodyFall = Flow.sequence(
    Flow.parallel(
      Flow.tween({
        targets: kidra.pos,
        props: { y: 342 },
        ease: Phaser.Math.Easing.Quadratic.Out,
        duration: 800,
      }),
      anims.tweenLegs({
        right: { thighAngle: DegToRad(standingRightAngle.thighAngle + 15) },
        left: { thighAngle: DegToRad(standingLeftAngle.thighAngle + 15) },
        duration: 500,
      }),
    ),
    Flow.withBackground({
      main: Flow.tween({
        targets: kidra.pos,
        props: { y: floor },
        ease: Phaser.Math.Easing.Quadratic.In,
      }),
      back: Flow.parallel(
        Flow.repeatSequence(
          anims.tweenRightLeg({
            angles: {
              thighAngle: DegToRad(standingRightAngle.thighAngle + 70),
              calfAngle: -DegToRad(120),
            },
            duration: 100,
          }),
          anims.tweenRightLeg({
            angles: {
              thighAngle: DegToRad(standingRightAngle.thighAngle + 15),
              calfAngle: -DegToRad(45),
            },
            duration: 100,
          }),
        ),
        Flow.sequence(
          Flow.waitTimer(100),
          Flow.repeatSequence(
            anims.tweenLeftLeg({
              angles: {
                thighAngle: DegToRad(standingLeftAngle.thighAngle + 70),
                calfAngle: -DegToRad(110),
              },
              duration: 100,
            }),
            anims.tweenLeftLeg({
              angles: {
                thighAngle: DegToRad(standingLeftAngle.thighAngle + 15),
                calfAngle: -DegToRad(45),
              },
              duration: 100,
            }),
          ),
        ),
      ),
    }),
    Flow.call(() => fallen.next(true)),
  );
  kidra.standingFoot = undefined;
  return Flow.sequence(
    kidra.headState.nextFlow(Flow.noop),
    anims.stopBreath,
    Flow.parallel(
      weaponFall,
      anims.tweenKidra({
        props: { bodyAngle: DegToRad(90) },
        duration: 800,
      }),
      bodyFall,
    ),
  );
});
