"use client";

import { useEffect, useState } from "react";

type WstawieniaRow = { year: string; values: string[] };

export function WstawieniaTable({ columns, fallbackRows }: { columns: string[]; fallbackRows: WstawieniaRow[] }) {
  const [rows, setRows] = useState(fallbackRows);

  useEffect(() => {
    void fetch("/api/wstawienia")
      .then((response) => response.ok ? response.json() : null)
      .then((data: { rows?: WstawieniaRow[] } | null) => {
        if (data?.rows?.length) setRows(data.rows);
      })
      .catch(() => undefined);
  }, []);

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