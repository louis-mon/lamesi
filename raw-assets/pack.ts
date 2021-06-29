import { packAsync } from "free-tex-packer-core";
import fs from "fs";
import Path from "path";
import util from "util";

const packImages = async (directory: string) => {
  const rawFiles = await fs.promises.readdir(directory);
  console.log(
    `Processing ${directory}...`,
    Path.dirname(directory),
    Path.basename(directory),
  );

  const images = await Promise.all(
    rawFiles
      .filter((file) => Path.extname(file) === ".png")
      .map(async (file) => ({
        path: file,
        contents: await fs.promises.readFile(`${directory}/${file}`),
      })),
  );
  try {
    const files = await packAsync(images, {
      textureName: Path.basename(directory),
      removeFileExtension: true,
      prependFolderName: false,
      base64Export: false,
      tinify: false,
      tinifyKey: "",
      scale: 1,
      exporter: "PhaserHash" as any,
      width: 2048,
      height: 2048,
      fixedSize: false,
      powerOfTwo: false,
      padding: 2,
      extrude: 0,
      allowRotation: false,
      allowTrim: true,
      alphaThreshold: 0,
      detectIdentical: true,
    });
    await Promise.all(
      files.map(async (item) => {
        const outDir = `../static/assets/${Path.dirname(directory)}`;
        try {
          await fs.promises.mkdir(outDir, { recursive: true });
        } catch {}
        return fs.promises.writeFile(`${outDir}/${item.name}`, item.buffer);
      }),
    );
  } catch (error) {
    console.log(error);
  }
};

const packDirectories = async (fromDir: string) => {
  if (await util.promisify(fs.exists)(`${fromDir}/packer.json`)) {
    await packImages(fromDir);
  } else {
    try {
      const subDirs = await fs.promises.readdir(fromDir);
      await Promise.all(
        subDirs.map((dir) =>
          packDirectories(Path.relative(".", `${fromDir}/${dir}`)),
        ),
      );
    } catch {}
  }
};

packDirectories("./");
