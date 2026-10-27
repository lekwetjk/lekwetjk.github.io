"use client";

import { useEffect, useRef, useState } from "react";
import type { DocxBulletinImage } from "../../lib/bulletin-docx";
import { buildOcrData, suggestOcrTable } from "../../lib/bulletin-ocr-model";
import type { PreparedBulletin } from "../../lib/prepared-bulletin-model";

type Review = { text: string; rawText: string; title: string; unit: string; section: string; kind: string; chart: boolean; message: string; reviewed: boolean };
type OcrClient = Awaited<ReturnType<typeof import("../../lib/bulletin-ocr-client").createBulletinOcr>>;

export default function DocxOcrReview({ images, disabled, onAdd, onBusy }: {
  images: DocxBulletinImage[];
  disabled: boolean;
  onAdd: (data: ReturnType<typeof buildOcrData>) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [replacements, setReplacements] = useState<Record<string, DocxBulletinImage>>({});
  const engine = useRef<OcrClient | null>(null);
  const active = useRef(true);
  const original = images[selected];
  const image = replacements[original.id] ?? original;
  const review = reviews[image.id] ?? { text: "", rawText: "", title: image.title, unit: "", section: "Pozostałe dane", kind: "barChart", chart: false, message: "", reviewed: false };
  const update = (patch: Partial<Review>) => setReviews((current) => ({ ...current, [image.id]: { ...review, ...patch } }));

  useEffect(() => {
    if (!/^image\/(?:png|jpeg|gif|bmp)$/.test(image.contentType)) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(new Blob([new Uint8Array(image.bytes)], { type: image.contentType }));
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; void engine.current?.terminate(); };
  }, []);

  async function recognize() {
    setRunning(true);
    onBusy(true);
    setStatus("Uruchamianie lokalnego odczytu…");
    try {
      if (!engine.current) {
        const { createBulletinOcr } = await import("../../lib/bulletin-ocr-client");
        engine.current = await createBulletinOcr((progress) => { if (active.current) setStatus(progress); });
      }
      const result = await engine.current.recognize(image);
      if (active.current) {
        const table = suggestOcrTable(result.text);
        update({ text: table ?? result.text, rawText: result.text, chart: Boolean(table), message: `${result.source}. Pewność odczytu: ${Math.round(result.confidence)}%. ${table ? "Zaproponowano tabelę z widocznych etykiet i liczb. " : ""}Popraw tekst i zatwierdź dane.`, reviewed: false });
        setStatus("Odczyt zakończony. Dane nie zostały jeszcze dodane do biuletynu.");
      }
    } catch (error) {
      if (active.current) setStatus(error instanceof Error ? error.message : "Błąd odczytu OCR.");
    } finally {
      if (active.current) { setRunning(false); onBusy(false); }
    }
  }

  function add() {
    try {
      const data = buildOcrData({ ...review, id: image.id });
      onAdd(data);
      update({ reviewed: true, message: "Zatwierdzone dane dodano do biuletynu." });
      setStatus("Dodano dane. Możesz sprawdzić je w podglądzie interaktywnym.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nieprawidłowe dane OCR.");
    }
  }

  async function replaceImage(file: File | undefined) {
    if (!file) return;
    if (!/\.(png|jpe?g|bmp|gif|tiff?)$/i.test(file.name) || file.size > 25 * 1024 * 1024 || !file.size) {
      setStatus("Wybierz niepusty obraz PNG, JPEG, BMP, GIF lub TIFF do 25 MB.");
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extension = file.name.split(".").pop()?.toLowerCase();
      const contentType = /jpe?g/.test(extension ?? "") ? "image/jpeg" : `image/${extension === "tif" ? "tiff" : extension}`;
      setReplacements((current) => ({ ...current, [original.id]: { ...original, name: file.name, bytes, contentType } }));
      update({ text: "", rawText: "", reviewed: false, message: "" });
      setStatus("Wgrano obraz zastępczy. Uruchom OCR.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nie udało się odczytać obrazu.");
    }
  }

  return <section className="report-ocr-review">
    <h3>Obrazy i OCR</h3>
    <p>OCR odczytuje widoczne napisy i liczby, nie wyznacza wartości z wysokości słupków. Wynik może zawierać błędy — popraw go i zatwierdź przed dodaniem. Tekst EMF odczytywany jest bezpośrednio, bez rozpoznawania obrazu.</p>
    <label>Obraz do odczytu
      <select value={selected} disabled={disabled || running} onChange={(event) => { setSelected(Number(event.target.value)); setStatus(""); }}>
        {images.map((item, index) => <option key={item.id} value={index}>{index + 1}. {item.name}{reviews[item.id]?.reviewed ? " — sprawdzony" : ""}</option>)}
      </select>
    </label>
    {previewUrl ? <img className="report-ocr-image" src={previewUrl} alt={`Obraz źródłowy ${image.name}`} /> : <p>Format {image.contentType} nie ma podglądu w przeglądarce. Porównaj odczyt z dokumentem Word.</p>}
    <label>Obraz zastępczy do OCR (opcjonalnie)<input type="file" accept=".png,.jpg,.jpeg,.bmp,.gif,.tif,.tiff" disabled={disabled || running} onChange={(event) => void replaceImage(event.target.files?.[0])} /></label>
    <div className="report-ocr-actions">
      <button type="button" className="button" disabled={disabled || running} onClick={() => void recognize()}>{running ? "Odczytywanie…" : "Odczytaj obraz (OCR)"}</button>
      <button type="button" className="button" disabled={disabled || running} onClick={() => update({ reviewed: true, message: "Obraz pominięty przez administratora (np. logo lub dekoracja)." })}>Pomiń obraz</button>
    </div>
    {review.message ? <p>{review.message}</p> : null}
    {review.rawText ? <details><summary>Oryginalny wynik odczytu</summary><pre className="report-ocr-raw">{review.rawText}</pre></details> : null}
    <label>Tytuł danych<input value={review.title} disabled={disabled || running} onChange={(event) => update({ title: event.target.value })} /></label>
    <label>Obszar<select value={review.section} disabled={disabled || running} onChange={(event) => update({ section: event.target.value })}>{["Produkcja mięsa drobiowego", "Ceny i rynek krajowy", "Handel zagraniczny", "Wylęgi i hodowla", "Pozostałe dane"].map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>Tekst / tabela po korekcie OCR<textarea rows={10} value={review.text} disabled={disabled || running} onChange={(event) => update({ text: event.target.value, reviewed: false })} /></label>
    <small>Do wykresu wpisz w pierwszym wierszu np. „Miesiąc;2026”, a poniżej „Styczeń;310,2”. Oddzielaj kolumny średnikami lub tabulatorami. Brak danych oznacz pustą komórką lub „—”; nie wpisuj zera zamiast braku danych.</small>
    <label><input type="checkbox" checked={review.chart} disabled={disabled || running} onChange={(event) => update({ chart: event.target.checked })} /> Utwórz również wykres z zatwierdzonych liczb</label>
    {review.chart ? <div className="report-period-grid">
      <label>Jednostka<input value={review.unit} placeholder="np. tys. ton, zł/kg, %" disabled={disabled || running} onChange={(event) => update({ unit: event.target.value })} /></label>
      <label>Wykres<select value={review.kind} disabled={disabled || running} onChange={(event) => update({ kind: event.target.value })}><option value="barChart">Słupkowy</option><option value="lineChart">Liniowy</option><option value="pieChart">Kołowy</option></select></label>
    </div> : null}
    <button className="button button-primary" type="button" disabled={disabled || running || !review.text.trim()} onClick={add}>Zatwierdź i dodaj dane OCR</button>
    {status ? <p role="status">{status}</p> : null}
  </section>;
}

export function addOcrToBulletin(bulletin: PreparedBulletin, data: ReturnType<typeof buildOcrData>): PreparedBulletin {
  const charts = [...bulletin.charts.filter((item) => item.id !== data.chart?.id && item.id !== data.table.id.replace("ocr-table-", "ocr-chart-")), ...(data.chart ? [data.chart] : [])];
  const tables = [...bulletin.tables.filter((item) => item.id !== data.table.id), data.table];
  return {
    ...bulletin, charts, tables, sections: [...new Set([...charts, ...tables].map((item) => item.section))],
    stats: { ...bulletin.stats, charts: charts.length, tables: tables.length, numericCells: tables.reduce((count, table) => count + table.rows.flat().filter((cell) => /^[−–-]?\d[\d\s.,%]*\*?$/.test(cell.trim())).length, 0) },
  };
}
