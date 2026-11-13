"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { buildWstawieniaChartSeries, type WstawieniaChartRow } from "../lib/wstawienia-chart";

const chartWidth = 980;
const chartHeight = 340;
const chartPadding = { top: 24, right: 24, bottom: 52, left: 80 };
const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

function mapValueToY(value: number, minValue: number, maxValue: number) {
  const span = maxValue - minValue || 1;
  return chartPadding.top + (1 - (value - minValue) / span) * plotHeight;
}

export function WstawieniaChart({ fallbackRows, children }: { fallbackRows: WstawieniaChartRow[]; children?: ReactNode }) {
  const [rows, setRows] = useState(fallbackRows);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let controller: AbortController | undefined;
    const loadRows = () => {
      controller?.abort();
      controller = new AbortController();
      void fetch("/api/wstawienia", { cache: "no-store", signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((data: { rows?: WstawieniaChartRow[] } | null) => {
          if (data?.rows?.length) {
            setRows(data.rows);
            setHasLoaded(true);
          }
        })
        .catch(() => undefined);
    };

    loadRows();
    window.addEventListener("focus", loadRows);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", loadRows);
    };
  }, [fallbackRows]);

  if (!hasLoaded && children) return children;

  const { yearly, dynamics } = buildWstawieniaChartSeries(rows);
  if (!yearly.length) return null;

  const totalTickStep = 3_000_000;
  const totalAxisMax = Math.max(totalTickStep, Math.ceil(Math.max(...yearly.map((point) => point.total)) / totalTickStep) * totalTickStep);
  const totalZeroY = mapValueToY(0, 0, totalAxisMax);
  const chartPoints = yearly.map((point, index) => ({
    ...point,
    x: chartPadding.left + (yearly.length <= 1 ? 0 : (index / (yearly.length - 1)) * plotWidth),
    y: mapValueToY(point.total, 0, totalAxisMax),
  }));
  const chartPath = chartPoints.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const yTicks = [] as Array<{ y: number; label: string }>;
  for (let value = totalAxisMax; value >= 0; value -= totalTickStep) {
    yTicks.push({ y: mapValueToY(value, 0, totalAxisMax), label: value.toLocaleString("pl-PL") });
  }
  const barWidth = Math.min(42, Math.max(12, (plotWidth / chartPoints.length) * 0.56));

  const dynamicsMinBase = dynamics.length ? Math.min(...dynamics.map((point) => point.dynamics)) : 90;
  const dynamicsMaxBase = dynamics.length ? Math.max(...dynamics.map((point) => point.dynamics)) : 110;
  const dynamicsMin = Math.min(0, Math.max(0, Math.floor(dynamicsMinBase - 2)));
  const dynamicsMax = Math.ceil(dynamicsMaxBase + 2);
  const dynamicsZeroY = mapValueToY(0, dynamicsMin, dynamicsMax);
  const dynamicsPoints = dynamics.map((point, index) => ({
    ...point,
    x: chartPadding.left + (dynamics.length <= 1 ? 0 : (index / (dynamics.length - 1)) * plotWidth),
    y: mapValueToY(point.dynamics, dynamicsMin, dynamicsMax),
  }));
  const dynamicsPath = dynamicsPoints.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const dynamicsTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = dynamicsMax - ratio * (dynamicsMax - dynamicsMin);
    return { y: chartPadding.top + ratio * plotHeight, label: `${value.toFixed(1).replace(".", ",")}%` };
  });

  return (
    <section className="wstawienia-chart" aria-label="Wykres rocznych wstawień">
      <h2>Wykres rocznych wstawień (kolumna „Rok”)</h2>
      <div className="wstawienia-chart-figure">
        <input type="radio" id="wstawienia-chart-line" name="wstawienia-chart-mode" className="wstawienia-chart-toggle-input" defaultChecked />
        <input type="radio" id="wstawienia-chart-bar" name="wstawienia-chart-mode" className="wstawienia-chart-toggle-input" />
        <input type="radio" id="wstawienia-chart-dynamics" name="wstawienia-chart-mode" className="wstawienia-chart-toggle-input" />
        <div className="wstawienia-chart-switch" role="group" aria-label="Przełącznik typu wykresu">
          <label htmlFor="wstawienia-chart-line">Liniowy</label>
          <label htmlFor="wstawienia-chart-bar">Słupkowy</label>
          <label htmlFor="wstawienia-chart-dynamics">Dynamika</label>
        </div>

        <svg className="wstawienia-chart-canvas" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Wykres rocznych wstawień">
          <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#ffffff" />
          {yTicks.map((tick, index) => <g key={`y-tick-${index}`}>
            <line x1={chartPadding.left} y1={tick.y} x2={chartWidth - chartPadding.right} y2={tick.y} className="wstawienia-chart-grid-line" />
            <text x={chartPadding.left - 10} y={tick.y + 4} textAnchor="end" className="wstawienia-chart-value">{tick.label}</text>
          </g>)}
          <line x1={chartPadding.left} y1={totalZeroY} x2={chartWidth - chartPadding.right} y2={totalZeroY} stroke="#b8b5ad" />
          <line x1={chartPadding.left} y1={chartPadding.top} x2={chartPadding.left} y2={chartHeight - chartPadding.bottom} stroke="#b8b5ad" />
          <g className="wstawienia-series wstawienia-series-line">
            <path d={chartPath} fill="none" stroke="#1f6c3d" strokeWidth="3" />
            {chartPoints.map((point) => <g key={`point-line-${point.year}`}>
              <circle cx={point.x} cy={point.y} r="4" fill={point.isPartialYear ? "#b27a1f" : "#1f6c3d"} />
              <text x={point.x} y={point.y - 10} textAnchor="middle" className="wstawienia-chart-value wstawienia-chart-point-value">
                {Math.round(point.total).toLocaleString("pl-PL")}{point.isPartialYear ? "*" : ""}
              </text>
            </g>)}
          </g>
          <g className="wstawienia-series wstawienia-series-bar">
            {chartPoints.map((point) => {
              const barX = Math.max(chartPadding.left, Math.min(point.x - barWidth / 2, chartWidth - chartPadding.right - barWidth));
              return <g key={`point-bar-${point.year}`}>
                <rect x={barX} y={Math.min(point.y, totalZeroY)} width={barWidth} height={Math.abs(totalZeroY - point.y)} fill={point.isPartialYear ? "#d4a24a" : "#3e8a57"} />
                <text x={barX + barWidth / 2} y={point.y - 8} textAnchor="middle" className="wstawienia-chart-value wstawienia-chart-point-value">
                  {Math.round(point.total).toLocaleString("pl-PL")}{point.isPartialYear ? "*" : ""}
                </text>
              </g>;
            })}
          </g>
          {chartPoints.map((point) => <text key={`x-label-${point.year}`} x={point.x} y={chartHeight - chartPadding.bottom + 20} textAnchor="middle" className="wstawienia-chart-year">{point.year}</text>)}
        </svg>

        {dynamicsPoints.length > 0 && <svg className="wstawienia-chart-canvas wstawienia-chart-canvas-dynamics" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Wykres dynamiki rocznej">
          <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#ffffff" />
          {dynamicsTicks.map((tick, index) => <g key={`dynamics-tick-${index}`}>
            <line x1={chartPadding.left} y1={tick.y} x2={chartWidth - chartPadding.right} y2={tick.y} className="wstawienia-chart-grid-line" />
            <text x={chartPadding.left - 10} y={tick.y + 4} textAnchor="end" className="wstawienia-chart-value">{tick.label}</text>
          </g>)}
          <line x1={chartPadding.left} y1={dynamicsZeroY} x2={chartWidth - chartPadding.right} y2={dynamicsZeroY} stroke="#b8b5ad" />
          <line x1={chartPadding.left} y1={chartPadding.top} x2={chartPadding.left} y2={chartHeight - chartPadding.bottom} stroke="#b8b5ad" />
          <path d={dynamicsPath} fill="none" stroke="#a3471f" strokeWidth="3" />
          {dynamicsPoints.map((point) => <g key={`dynamics-point-${point.year}`}>
            <circle cx={point.x} cy={point.y} r="4" fill={point.isPartial ? "#b27a1f" : "#a3471f"} />
            <text x={point.x} y={point.y - 10} textAnchor="middle" className="wstawienia-chart-value wstawienia-chart-point-value">
              {`${point.dynamics.toFixed(1).replace(".", ",")}%`}{point.isPartial ? "*" : ""}
            </text>
            <text x={point.x} y={chartHeight - chartPadding.bottom + 20} textAnchor="middle" className="wstawienia-chart-year">{point.year}</text>
          </g>)}
        </svg>}

        {dynamicsPoints.some((point) => point.isPartial) && <p className="wstawienia-chart-note">
          * Dynamika częściowa: porównanie dostępnych miesięcy z analogicznymi miesiącami poprzedniego roku.
        </p>}
        {chartPoints.some((point) => point.isPartialYear) && <p className="wstawienia-chart-note">
          * Wartość częściowa: suma miesięcy dostępnych dla niepełnego roku.
        </p>}
      </div>
    </section>
  );
}