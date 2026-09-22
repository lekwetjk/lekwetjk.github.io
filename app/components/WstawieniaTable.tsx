"use client";

import { useEffect, useState } from "react";

type WstawieniaRow = { year: string; values: string[] };

export function WstawieniaTable({ columns, fallbackRows, transpose = false }: { columns: string[]; fallbackRows: WstawieniaRow[]; transpose?: boolean }) {
  const [rows, setRows] = useState(fallbackRows);

  useEffect(() => {
    void fetch("/api/wstawienia")
      .then((response) => response.ok ? response.json() : null)
      .then((data: { rows?: WstawieniaRow[] } | null) => {
        if (data?.rows?.length) setRows(data.rows);
      })
      .catch(() => undefined);
  }, []);

  if (transpose) {
    return (
      <div className="wstawienia-table-wrap" aria-label="Tabela wstawień: lata w kolumnach">
        <table className="wstawienia-table">
          <thead><tr><th scope="col">Miesiąc / podsumowanie</th>{rows.map((row) => <th scope="col" key={row.year}>{row.year}</th>)}</tr></thead>
          <tbody>{columns.map((column, index) => {
            const isDynamics = column === "Dynamika";
            const previousPeriod = columns[index - 1] ?? "";
            const isAnnual = column === "Rok" || (isDynamics && previousPeriod === "Rok");
            let rowClass: string | undefined;
            if (isDynamics) {
              rowClass = /^(?:[IVX]+ półrocze|Rok)$/.test(previousPeriod) ? "wstawienia-row-dynamics-summary" : "wstawienia-row-dynamics";
            } else if (/^[IVX]+ kwartał$/.test(column)) {
              rowClass = "wstawienia-row-quarter";
            }
            return <tr key={`${column}-${index}`} data-annual={isAnnual ? "true" : undefined} className={rowClass}>
              <th scope="row">{column}</th>
              {rows.map((row) => <td key={row.year}>{row.values[index] ?? ""}</td>)}
            </tr>;
          })}</tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="wstawienia-table-wrap" aria-label="Tabela wstawień 2015-2026">
      <table className="wstawienia-table">
        <thead>
          <tr>
            <th>Rok</th>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <th scope="row">{row.year}</th>
              {columns.map((_, index) => <td key={`${row.year}-${index}`}>{row.values[index] ?? ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}