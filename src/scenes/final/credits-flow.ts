import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { credits } from "/src/scenes/final/credits";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import { tr } from "/src/i18n/i18n";
import Vector2 = Phaser.Math.Vector2;
import { makeSceneStates } from "/src/helpers/phaser-flow";

export const creditsFlow = ({
  canSkip,
}: {
  canSkip: boolean;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    let y = gameHeight + 30;
    const yMax = -gameHeight / 2;

    const depth = 2000;
    const overlay = scene.add
      .rectangle(0, 0, gameWidth, gameHeight, 0, 0)
      .setOrigin(0, 0)
      .setDepth(depth)
      .setInteractive();
    const cont = scene.add.container(0, 0).setDepth(depth);

    function addText(
      t: string,
      style?: Phaser.Types.GameObjects.Text.TextStyle,
    ) {
      const text = scene.add
        .text(gameWidth / 2, y, t, { align: "center", ...style })
        .setOrigin(0.5, 0.5);
      cont.add(text);
      y += text.height;
    }

    credits.forEach((category) => {
      addText(tr(category.category), { fontSize: "45px" });
      y += 20;
      category.entries.forEach((entry) => {
        addText(entry.label, { fontSize: "30px" });
      });
      y += 40;
    });

    y += gameHeight / 2;

    addText(tr("credits.thankyou"), { fontSize: "75px" });

    const yMin = -y + gameHeight / 2;

    function moveCredits(speed: number) {
      cont.y = Phaser.Math.Clamp(cont.y + speed, yMin, yMax);
    }

    const moveButtons: Flow.PhaserNode = Flow.lazy(() => {
      const up = scene.add
        .text(gameWidth - 50, 50, "↑", {
          fontSize: "50px",
          align: "center",
        })
        .setOrigin(1, 0)
        .setInteractive()
        .setDepth(depth);
      const down = scene.add
        .text(gameWidth - 50, 50 + up.height + 20, "↓", {
          fontSize: "50px",
          align: "center",
        })
        .setOrigin(1, 0)
        .setInteractive()
        .setDepth(depth);
      const speed = 20;

      function executeWhenDown(
        o: Phaser.GameObjects.GameObject,
        f: () => void,
      ) {
        const state = makeSceneStates();
        o.on("pointerdown", () => {
          state.next(Flow.onPostUpdate(() => f));
        });
        o.on("pointerup", () => state.next(Flow.noop));
        o.on("pointerout", () => state.next(Flow.noop));
        return state.start();
      }

      const moveDown = () => {
        moveCredits(-speed);
      };
      scene.input.keyboard.on("keydown-DOWN", moveDown);
      const moveUp = () => {
        moveCredits(speed);
      };
      scene.input.keyboard.on("keydown-UP", moveUp);
      return Flow.withCleanup({
        flow: Flow.parallel(
          executeWhenDown(up, moveUp),
          executeWhenDown(down, moveDown),
        ),
        cleanup: () => {
          up.destroy();
          down.destroy();
        },
      });
    });

    const creditsState = makeSceneStates();

    const showCredits: Flow.PhaserNode = Flow.sequence(
      Flow.tween({
        targets: overlay,
        props: { fillAlpha: 0.7 },
        duration: 2000,
      }),
      Flow.moveTo({
        target: cont,
        dest: new Vector2(0, yMin),
        speed: 100,
      }),
      moveButtons,
    );

    if (canSkip) {
      overlay.on("pointerdown", () => {
        creditsState.next(creditsState.completeFlow);
      });
    }

    return Flow.withCleanup({
      flow: creditsState.start(showCredits),
      cleanup: () => {
        overlay.destroy();
        cont.destroy();
      },
    });
  });
