import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "public", "ocr");
await mkdir(output, { recursive: true });
const copy = (source, name) => copyFile(path.join(root, "node_modules", ...source), path.join(output, name));
await copy(["tesseract.js", "dist", "worker.min.js"], "worker.min.js");
for (const variant of ["lstm", "simd-lstm", "relaxedsimd-lstm"]) {
  for (const extension of ["wasm.js", "wasm"]) {
    const name = `tesseract-core-${variant}.${extension}`;
    await copy(["tesseract.js-core", name], name);
  }
}
for (const language of ["pol", "eng"]) {
  await copy(["@tesseract.js-data", language, "4.0.0_best_int", `${language}.traineddata.gz`], `${language}.traineddata.gz`);
}
console.log("Przygotowano lokalne zasoby OCR (polski i angielski) w public/ocr.");
