import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { credits } from "/src/scenes/final/credits";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import { tr } from "/src/i18n/i18n";
import Vector2 = Phaser.Math.Vector2;

export const creditsFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  let y = gameHeight + 30;
  const yMax = gameHeight;

  const depth = 2000;
  const overlay = scene.add
    .rectangle(0, 0, gameWidth, gameHeight, 0, 0)
    .setOrigin(0, 0)
    .setDepth(depth);
  const cont = scene.add.container(0, 0).setDepth(depth);

  function addText(t: string, style?: Phaser.Types.GameObjects.Text.TextStyle) {
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

  return Flow.sequence(
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
    Flow.call(() => {
      scene.add
        .text(gameWidth - 50, 50, "↑\n↓", {
          fontSize: "40px",
          align: "center",
        })
        .setOrigin(1, 0)
        .setDepth(depth);
      const speed = 20;
      scene.input.keyboard.on("keydown-DOWN", () => {
        moveCredits(-speed);
      });
      scene.input.keyboard.on("keydown-UP", () => {
        moveCredits(speed);
      });
    }),
    Flow.infinite,
  );
});
