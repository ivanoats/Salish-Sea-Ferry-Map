// Rasterizes the SVG sources in scripts/icons/ into the favicon set.
// src/app/icon.svg is hand-maintained (it carries a dark-mode variant);
// everything else is generated here. Re-run after changing the mark:
//   node scripts/generate-favicons.mjs
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const favicon = await readFile("scripts/icons/favicon-source.svg");
const appIcon = await readFile("scripts/icons/app-icon-source.svg");

const png = (svg, size) =>
  sharp(svg, { density: (72 * size) / 32 }).resize(size, size).png().toBuffer();

// ICO container holding PNG-encoded images (supported by every current browser).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size % 256, 0);
    entry.writeUInt8(size % 256, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

const icoImages = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await png(favicon, size) })),
);
await writeFile("src/app/favicon.ico", ico(icoImages));
await writeFile("src/app/apple-icon.png", await png(appIcon, 180));
await writeFile("public/icons/icon-192.png", await png(appIcon, 192));
await writeFile("public/icons/icon-512.png", await png(appIcon, 512));

console.log("favicon set written");
