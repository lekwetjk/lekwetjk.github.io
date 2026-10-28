"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSON as LeafletGeoJSON, Map as LeafletMap } from "leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";

import { buildExportMapData, type ExportMapCountry, type ExportMapMetric, type ExportMapRecord } from "../lib/bulletin-export-map";
import type { PreparedBulletin } from "../lib/prepared-bulletin-model";
import styles from "./BulletinExportMap.module.css";

type Region = "all" | "UE" | "poza UE";
type Code = "cn0207" | "cn1602";
type CountryProperties = { iso3: string; name: string };
type Countries = FeatureCollection<Geometry, CountryProperties>;

const metrics: Record<ExportMapMetric, { label: string; unit: string }> = {
  netMassKg: { label: "Masa netto", unit: "kg" },
  valueEur: { label: "Wartość w EUR", unit: "EUR" },
  shareKg: { label: "Udział w eksporcie — kg", unit: "%" },
  shareEur: { label: "Udział w eksporcie — EUR", unit: "%" },
};
const palettes: Record<Region, string[]> = {
  all: ["#fff2c2", "#f6d078", "#ef9b57", "#de6551", "#ad4266", "#773a70", "#493565", "#27285a"],
  UE: ["#eef5fc", "#d6e8f7", "#b5d4ed", "#8bb9df", "#6099cd", "#3b7ab8", "#205b9b", "#103b70"],
  "poza UE": ["#edf3f0", "#d4e1dc", "#b7ccc3", "#94b4a7", "#70998a", "#4d7d6d", "#2f6253", "#153a31"],
};

function colorFor(value: number, max: number, metric: ExportMapMetric, palette: string[]) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const adjusted = metric === "shareKg" || metric === "shareEur" ? ratio : Math.sqrt(ratio);
  const position = adjusted * (palette.length - 1);
  const index = Math.min(palette.length - 2, Math.floor(position));
  const channels = [1, 3, 5].map((offset) => {
    const start = parseInt(palette[index].slice(offset, offset + 2), 16);
    const end = parseInt(palette[index + 1].slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * (position - index));
  });
  return `rgb(${channels.join(", ")})`;
}

function countryContent(country: ExportMapCountry, period: string, selectedCode: Code, selectedMetric: ExportMapMetric) {
  const fields: Array<{ key: keyof Omit<ExportMapRecord, "sourceTable">; label: string; unit: string }> = [
    { key: "netMassKg", label: "Masa netto", unit: "kg" },
    { key: "valuePln", label: "Wartość PLN", unit: "PLN" },
    { key: "valueUsd", label: "Wartość USD", unit: "USD" },
    { key: "valueEur", label: "Wartość EUR", unit: "EUR" },
    { key: "shareKg", label: "Udział — kg", unit: "" },
    { key: "shareEur", label: "Udział — EUR", unit: "" },
  ];
  return <div className={styles.popup}>
    <strong>{country.name}</strong>
    <p>{country.region} · {period}</p>
    {(["cn0207", "cn1602"] as const).map((code) => {
    const record = country.records[code];
    return <section key={code}>
      <b>{code === "cn0207" ? "CN 0207 — mięso i podroby" : "CN 1602 — przetwory"}</b>
      {record ? <dl>{fields.map((field) => <div key={field.key}>
        <dt>{field.label}</dt>
        <dd className={code === selectedCode && field.key === selectedMetric ? styles.activeValue : undefined}>
          {record[field.key].text}{field.unit ? ` ${field.unit}` : ""}
        </dd>
      </div>)}</dl> : <p>Brak rekordu w tabeli źródłowej.</p>}
    </section>;
    })}
  </div>;
}

export default function BulletinExportMap({ bulletin }: { bulletin: PreparedBulletin }) {
  const mapData = useMemo(() => bulletin.exportMap ? buildExportMapData(bulletin.tables, bulletin.exportMap, bulletin.id) : null, [bulletin]);
  const [region, setRegion] = useState<Region>("all");
  const [code, setCode] = useState<Code>("cn0207");
  const [metric, setMetric] = useState<ExportMapMetric>("netMassKg");
  const [hint, setHint] = useState(false);
  const [error, setError] = useState("");
  const [geo, setGeo] = useState<Countries | null>(null);
  const [ready, setReady] = useState(false);
  const [activeCountry, setActiveCountry] = useState<{ iso3: string; pinned: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LeafletGeoJSON<CountryProperties> | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const countryByIso = useMemo(() => new Map(mapData?.countries.map((country) => [country.iso3, country])), [mapData]);
  const selectedCountry = activeCountry ? countryByIso.get(activeCountry.iso3) : undefined;
  const filtered = mapData?.countries.filter((country) => region === "all" || country.region === region) ?? [];
  const values = filtered.flatMap((country) => {
    const value = country.records[code]?.[metric].value;
    return value === undefined ? [] : [value];
  });
  const max = Math.max(0, ...values);
  const isShare = metric === "shareKg" || metric === "shareEur";
  const palette = palettes[region];
  const legend = `linear-gradient(90deg, ${palette.map((color, i) => {
    const position = i / (palette.length - 1);
    return `${color} ${(isShare ? position : position ** 2) * 100}%`;
  }).join(", ")})`;
  const format = (value: number) => `${value.toLocaleString("pl-PL", { maximumFractionDigits: isShare ? 2 : 0 })}${isShare ? "%" : ` ${metrics[metric].unit}`}`;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let removeWheel: (() => void) | undefined;
    async function initialize() {
      try {
        const [{ default: L }, response] = await Promise.all([
          import("leaflet"),
          fetch("/data/export-map-countries.geojson", { signal: controller.signal }),
        ]);
        if (!response.ok) throw new Error(`Nie można pobrać geometrii mapy (HTTP ${response.status}).`);
        const collection = await response.json() as Countries;
        if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) throw new Error("Nieprawidłowy plik geometrii mapy.");
        if (!active || !containerRef.current) return;
        const missing = mapData?.countries.filter((country) => !collection.features.some((feature) => feature.properties?.iso3 === country.iso3)) ?? [];
        if (missing.length) throw new Error(`Brak geometrii dla państw: ${missing.map((country) => country.name).join(", ")}.`);
        const map = L.map(containerRef.current, { scrollWheelZoom: false, minZoom: 1, maxZoom: 6, attributionControl: false });
        map.fitBounds([[-58, -176], [82, 178]], { padding: [8, 8] });
        map.setMaxBounds([[-85, -190], [90, 190]]);
        const onWheel = (event: WheelEvent) => {
          if (event.ctrlKey) {
            map.scrollWheelZoom.enable();
            clearTimeout(timer);
            setHint(false);
          } else {
            map.scrollWheelZoom.disable();
            setHint(true);
            clearTimeout(timer);
            timer = setTimeout(() => setHint(false), 2500);
          }
        };
        map.getContainer().addEventListener("wheel", onWheel, { capture: true, passive: true });
        removeWheel = () => map.getContainer().removeEventListener("wheel", onWheel, { capture: true });
        leafletRef.current = L;
        mapRef.current = map;
        setGeo(collection);
        setReady(true);
        setTimeout(() => { if (active) map.invalidateSize(); }, 0);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Nie udało się uruchomić mapy.");
      }
    }
    void initialize();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
      removeWheel?.();
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
    };
  }, [mapData]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !L || !geo || !mapData) return;
    layerRef.current?.remove();
    const layer = L.geoJSON<CountryProperties>(geo, {
      style: (feature) => {
        const country = feature && countryByIso.get(feature.properties.iso3);
        const value = country && (region === "all" || country.region === region) ? country.records[code]?.[metric].value : undefined;
        return { color: value === undefined ? "#c7ccc8" : "#fffefa", weight: value === undefined ? 0.45 : 0.8, fillColor: value === undefined ? "#dfe3e0" : colorFor(value, max, metric, palette), fillOpacity: 1 };
      },
      onEachFeature: (feature, featureLayer) => {
        const country = countryByIso.get(feature.properties.iso3);
        if (!country || (region !== "all" && country.region !== region)) return;
        const show = () => setActiveCountry((current) => current?.pinned ? current : { iso3: country.iso3, pinned: false });
        const hide = () => setActiveCountry((current) => current?.iso3 === country.iso3 && !current.pinned ? null : current);
        const pin = () => setActiveCountry({ iso3: country.iso3, pinned: true });
        const getElement = () => "getElement" in featureLayer && typeof featureLayer.getElement === "function" ? featureLayer.getElement() : null;
        featureLayer.on({ mouseover: show, mouseout: () => { if (getElement() !== document.activeElement) hide(); }, click: pin });
        featureLayer.on("add", () => {
          const element = getElement();
          if (element instanceof Element) {
            element.setAttribute("tabindex", "0");
            element.setAttribute("role", "button");
            element.setAttribute("aria-label", `${country.name}, pokaż dane eksportowe`);
            element.addEventListener("focus", show);
            element.addEventListener("blur", () => { if (!element.matches(":hover")) hide(); });
            element.addEventListener("keydown", (event) => {
              if (event instanceof KeyboardEvent && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                pin();
              } else if (event instanceof KeyboardEvent && event.key === "Escape") {
                setActiveCountry(null);
              }
            });
          }
        });
      },
    }).addTo(map);
    layerRef.current = layer;
    return () => { layer.remove(); };
  }, [ready, geo, mapData, countryByIso, region, code, metric, max, palette]);

  if (!mapData) return null;
  return <section className={styles.section} aria-labelledby="export-map-heading">
    <header><p>Handel zagraniczny</p><h2 id="export-map-heading">Eksport według państw</h2></header>
    <div className={styles.layout}>
      <div className={styles.filters}>
        <label>Obszar eksportu<select value={region} onChange={(event) => { setActiveCountry(null); setRegion(event.target.value as Region); }}>
          <option value="all">Wszystkie państwa</option><option value="UE">Państwa UE</option><option value="poza UE">Państwa poza UE</option>
        </select></label>
        <label>Grupa kodów<select value={code} onChange={(event) => { setActiveCountry(null); setCode(event.target.value as Code); }}>
          <option value="cn0207">CN 0207 — mięso i podroby</option><option value="cn1602">CN 1602 — przetwory</option>
        </select></label>
        <label>Parametr kolorowania<select value={metric} onChange={(event) => { setActiveCountry(null); setMetric(event.target.value as ExportMapMetric); }}>
          {Object.entries(metrics).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}
        </select></label>
        <p>Okres danych: <strong>{mapData.period}</strong></p>
        <p>{values.length} państw z danymi dla wybranej grupy.</p>
      </div>
      <div className={styles.mapArea}>
        <div className={styles.mapFrame}>
          <div className={styles.map} ref={containerRef} aria-label="Mapa świata przedstawiająca eksport według państw" />
          {selectedCountry && activeCountry ? <aside className={`${styles.countryDetails} ${activeCountry.pinned ? styles.pinned : ""}`} aria-label={`Dane eksportowe: ${selectedCountry.name}`}>
            {activeCountry.pinned ? <button type="button" className={styles.close} aria-label="Zamknij dane kraju" onClick={() => setActiveCountry(null)}>×</button> : null}
            {countryContent(selectedCountry, mapData.period, code, metric)}
          </aside> : null}
          {hint ? <div className={styles.hint} role="status">Aby zmienić przybliżenie mapy, przytrzymaj Ctrl i użyj kółka myszy.</div> : null}
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
        </div>
        <div className={styles.legend}>
          <strong>{metrics[metric].label} · {code === "cn0207" ? "CN 0207" : "CN 1602"}</strong>
          <div className={styles.gradient} style={{ background: legend }} />
          <div className={styles.legendValues}><span>{format(0)}</span><span>{format(max / 2)}</span><span>{format(max)}</span></div>
          <p>Szary kolor oznacza brak rekordu lub państwo poza wybranym obszarem. Masa i wartość wykorzystują skalę pierwiastkową.</p>
          <p>Najedź na kraj, aby zobaczyć jego dane, lub kliknij go, aby je przypiąć. Przytrzymaj Ctrl i użyj kółka myszy, aby zmienić przybliżenie. Możesz także użyć przycisków + i −.</p>
        </div>
      </div>
    </div>
    <details className={styles.dataTable}><summary>Lista danych eksportowych</summary>
      <div><table><thead><tr><th>Państwo</th><th>Masa netto</th><th>Wartość EUR</th><th>Udział kg</th><th>Udział EUR</th></tr></thead>
        <tbody>{filtered.map((country) => {
          const record = country.records[code];
          return <tr key={country.iso3}><th>{country.name}</th>{(["netMassKg", "valueEur", "shareKg", "shareEur"] as const).map((field) => <td key={field}>{record?.[field].text ?? "Brak danych"}</td>)}</tr>;
        })}</tbody></table></div>
    </details>
  </section>;
}
