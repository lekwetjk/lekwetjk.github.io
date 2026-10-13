"use client";

import { useEffect, useState } from "react";

import {
  memberProfileDictionaryCategories,
  memberProfileDictionaryLabels,
  type MemberProfileDictionaryCategory,
  type MemberProfileDictionaryOption,
} from "../../lib/member-profile-options";

type Dictionaries = Record<MemberProfileDictionaryCategory, MemberProfileDictionaryOption[]>;

const emptyDictionaries: Dictionaries = {
  voivodeships: [],
  businessScopes: [],
  poultrySpecies: [],
  assortments: [],
  certifications: [],
  exportPermits: [],
};

type ApiResponse = {
  dictionaries?: Dictionaries;
  option?: MemberProfileDictionaryOption;
  error?: string;
};

async function readResponse(response: Response) {
  const data = await response.json() as ApiResponse;
  if (!response.ok) throw new Error(data.error ?? "Nie udało się zapisać słownika.");
  return data;
}

function DictionaryRow({
  option,
  onSaved,
}: {
  option: MemberProfileDictionaryOption;
  onSaved: () => Promise<void>;
}) {
  const [valuePl, setValuePl] = useState(option.valuePl);
  const [valueEn, setValueEn] = useState(option.valueEn);
  const [sortOrder, setSortOrder] = useState(option.sortOrder);
  const [isActive, setIsActive] = useState(option.isActive);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await readResponse(await fetch("/api/admin/member-profile/options", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: option.id,
          category: option.category,
          valuePl,
          valueEn,
          sortOrder,
          isActive,
        }),
      }));
      await onSaved();
      setMessage("Zapisano");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się zapisać wartości.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(180px, 1fr) 90px auto auto", gap: 8, alignItems: "center" }}>
      <input value={valuePl} onChange={(event) => setValuePl(event.target.value)} aria-label="Wartość polska" style={{ padding: 8, border: "1px solid #94a3b8", borderRadius: 6 }} />
      <input value={valueEn} onChange={(event) => setValueEn(event.target.value)} aria-label="Tłumaczenie angielskie" style={{ padding: 8, border: "1px solid #94a3b8", borderRadius: 6 }} />
      <input type="number" min={0} value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} aria-label="Kolejność" style={{ padding: 8, border: "1px solid #94a3b8", borderRadius: 6 }} />
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Aktywna
      </label>
      <button type="button" onClick={() => void save()} disabled={saving} style={{ padding: "8px 12px", background: "#1f3a5f", color: "white", border: 0, borderRadius: 6, fontWeight: 700 }}>
        {saving ? "Zapisywanie..." : "Zapisz"}
      </button>
      {message ? <small style={{ gridColumn: "1 / -1", color: message === "Zapisano" ? "#166534" : "#b91c1c" }}>{message}</small> : null}
    </div>
  );
}

export default function ProfileDictionaryManager() {
  const [dictionaries, setDictionaries] = useState<Dictionaries>(emptyDictionaries);
  const [category, setCategory] = useState<MemberProfileDictionaryCategory>("businessScopes");
  const [valuePl, setValuePl] = useState("");
  const [valueEn, setValueEn] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await readResponse(await fetch("/api/admin/member-profile/options", { cache: "no-store" }));
    if (data.dictionaries) setDictionaries(data.dictionaries);
    setLoading(false);
  }

  useEffect(() => {
    void load().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Nie udało się pobrać słowników.");
      setLoading(false);
    });
  }, []);

  async function addOption(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await readResponse(await fetch("/api/admin/member-profile/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          valuePl,
          valueEn,
          sortOrder: dictionaries[category].length,
        }),
      }));
      setValuePl("");
      setValueEn("");
      await load();
      setMessage("Wartość dodana");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się dodać wartości.");
    }
  }

  return (
    <section style={{ marginTop: 18, padding: 16, border: "1px solid #d5d9df", borderRadius: 8 }}>
      <h2 style={{ margin: "0 0 8px" }}>Słowniki formularza członkowskiego</h2>
      <p style={{ margin: "0 0 16px", color: "#475569" }}>
        Zarządzaj wartościami używanymi w formularzu „Dołącz do nas” i profilach członków. Nieaktywne pozycje nie są widoczne w formularzach.
      </p>

      <form onSubmit={addOption} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr) auto", gap: 8, marginBottom: 20 }}>
        <select value={category} onChange={(event) => setCategory(event.target.value as MemberProfileDictionaryCategory)} aria-label="Słownik" style={{ padding: 9, border: "1px solid #94a3b8", borderRadius: 6 }}>
          {memberProfileDictionaryCategories.map((item) => <option key={item} value={item}>{memberProfileDictionaryLabels[item]}</option>)}
        </select>
        <input value={valuePl} onChange={(event) => setValuePl(event.target.value)} placeholder="Wartość polska" aria-label="Nowa wartość polska" style={{ padding: 9, border: "1px solid #94a3b8", borderRadius: 6 }} />
        <input value={valueEn} onChange={(event) => setValueEn(event.target.value)} placeholder="Tłumaczenie angielskie" aria-label="Nowe tłumaczenie angielskie" style={{ padding: 9, border: "1px solid #94a3b8", borderRadius: 6 }} />
        <button type="submit" style={{ padding: "9px 14px", background: "#0f766e", color: "white", border: 0, borderRadius: 6, fontWeight: 700 }}>Dodaj</button>
      </form>

      {message ? <p role="status" style={{ color: message === "Wartość dodana" ? "#166534" : "#b91c1c" }}>{message}</p> : null}
      {loading ? <p>Ładowanie słowników...</p> : memberProfileDictionaryCategories.map((dictionaryCategory) => (
        <details key={dictionaryCategory} open={dictionaryCategory === category} style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            {memberProfileDictionaryLabels[dictionaryCategory]} ({dictionaries[dictionaryCategory].length})
          </summary>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) minmax(180px, 1fr) 90px auto auto", gap: 8, color: "#475569", fontSize: 13 }}>
              <span>Polski</span><span>English</span><span>Kolejność</span><span>Status</span><span />
            </div>
            {dictionaries[dictionaryCategory].map((item) => (
              <DictionaryRow key={item.id} option={item} onSaved={load} />
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
