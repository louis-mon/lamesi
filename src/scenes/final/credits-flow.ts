import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { credits } from "/src/scenes/final/credits";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import { tr } from "/src/i18n/i18n";
import Vector2 = Phaser.Math.Vector2;
import { makeSceneStates } from "/src/helpers/phaser-flow";

interface ParsedItem {
  type: "text" | "link";
  content: string;
  href?: string;
}

// Function to parse HTML string and extract text and links
function parseHTMLString(html: string): ParsedItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = doc.body.childNodes;
  const result: ParsedItem[] = [];

  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result.push({ type: "text", content: node.textContent || "" });
    } else if (node.nodeName === "A" && node instanceof HTMLAnchorElement) {
      result.push({
        type: "link",
        content: node.textContent || "",
        href: node.getAttribute("href") || "",
      });
    }
  });

  return result;
}

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

    function displayHTMLCentered(
      html: string,
      style?: Phaser.Types.GameObjects.Text.TextStyle,
    ): void {
      const parsedContent: ParsedItem[] = parseHTMLString(html);

      // First, calculate total width of the entire string (both text and links)
      let totalWidth = 0;
      parsedContent.forEach((item) => {
        if (item.type === "text" || item.type === "link") {
          const tempText = scene.add.text(0, 0, item.content, style);
          const textWidth = tempText.width;
          totalWidth += textWidth;
          tempText.destroy();
        }
      });

      // Start drawing text from this x coordinate to center the entire content
      const startX = (scene.scale.width - totalWidth) / 2;
      let currentX = startX;

      let maxH = 0;

      parsedContent.forEach((item) => {
        if (item.type === "text") {
          // Add plain text
          const textObject = scene.add.text(currentX, y, item.content, {
            ...style,
            color: "#ffffff",
          });
          currentX += textObject.width; // Adjust X position for the next object
          cont.add(textObject);
          maxH = Math.max(maxH, textObject.height);
        } else if (item.type === "link" && item.href) {
          // Add interactive link text
          const linkObject = scene.add.text(currentX, y, item.content, {
            ...style,
            color: "#66CCFF",
          });
          linkObject.setInteractive({ useHandCursor: true });

          // Change color on hover
          linkObject.on("pointerover", () => {
            linkObject.setStyle({ fill: "#ff0" });
          });

          linkObject.on("pointerout", () => {
            linkObject.setStyle({ fill: "#66CCFF" });
          });

          // Open the link in a new tab when clicked
          linkObject.on("pointerdown", () => {
            window.open(item.href, "_blank");
          });

          currentX += linkObject.width; // Adjust X position for the next object
          cont.add(linkObject);
          maxH = Math.max(maxH, linkObject.height);
        }
      });
      y += maxH;
    }

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
        displayHTMLCentered(entry.label, { fontSize: "30px" });
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
