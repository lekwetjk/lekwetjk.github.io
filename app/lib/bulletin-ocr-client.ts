import { createWorker, OEM, PSM, type Worker } from "tesseract.js";
import { withBasePath } from "./basePath";
import { readEmfText } from "./bulletin-ocr-model";
import type { DocxBulletinImage } from "./bulletin-docx";

export async function createBulletinOcr(onProgress: (progress: string) => void) {
  let worker: Worker | undefined;
  return {
    async recognize(image: DocxBulletinImage) {
      if (image.contentType === "image/emf") return { text: readEmfText(image.bytes), confidence: 100, source: "Odczyt tekstu wektorowego EMF (bez OCR)" };
      if (image.contentType === "image/wmf") throw new Error("Zapisz ten obraz WMF jako PNG w Wordzie i wgraj go ponownie do OCR.");
      worker ??= await createWorker("pol+eng", OEM.LSTM_ONLY, {
        workerPath: withBasePath("/ocr/worker.min.js"),
        corePath: withBasePath("/ocr"),
        langPath: withBasePath("/ocr"),
        workerBlobURL: false,
        logger: (event) => onProgress(`${event.status} — ${Math.round(event.progress * 100)}%`),
      });
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
      const data = await worker.recognize(new Blob([new Uint8Array(image.bytes)], { type: image.contentType }), {}, { text: true });
      if (!data.data.text.trim()) throw new Error("Nie znaleziono czytelnego tekstu. Wgraj obraz w większej rozdzielczości lub uzupełnij dane ręcznie.");
      return { text: data.data.text, confidence: data.data.confidence, source: "OCR polski + angielski" };
    },
    async terminate() {
      await worker?.terminate();
    },
  };
}
