import { packAsync } from "free-tex-packer-core";
import fs from "fs";
import Path from "path";
import util from "util";

const packImages = async (directory: string) => {
  const rawFiles = await util.promisify(fs.readdir)(directory);
  console.log(
    `Processing ${directory}...`,
    Path.dirname(directory),
    Path.basename(directory),
  );

  const images = rawFiles
    .filter((file) => Path.extname(file) === ".png")
    .map((file) => ({
      path: file,
      contents: fs.readFileSync(`${directory}/${file}`),
    }));
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
    for (let item of files) {
      fs.writeFileSync(
        `../static/assets/${Path.dirname(directory)}/${item.name}`,
        item.buffer,
      );
    }
  } catch (error) {
    console.log(error);
  }
};

const packDirectories = async (fromDir: string) => {
  if (await util.promisify(fs.exists)(`${fromDir}/packer.json`)) {
    await packImages(fromDir);
  } else {
    try {
      const subDirs = await util.promisify(fs.readdir)(fromDir);
      await Promise.all(
        subDirs.map((dir) =>
          packDirectories(Path.relative(".", `${fromDir}/${dir}`)),
        ),
      );
    } catch {}
  }
};

packDirectories("./");
