"use client";

import { useEffect, useState } from "react";
import { acceptedProposalIds, localProposals, PROPOSAL_COOKIE, rejectedProposalIds, reviewedProposals, type ProposalFlags, type ProposalId } from "../lib/local-proposals";

type Decision = "pending" | "keep" | "drop";
const decisionKey = "krd-pending-proposal-decisions-v2";

export default function ProposalPanel({ initialFlags }: { initialFlags: ProposalFlags }) {
  const [flags, setFlags] = useState(initialFlags);
  const [decisions, setDecisions] = useState<Partial<Record<ProposalId, Decision>>>({});
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    try {
      const saved = JSON.parse(localStorage.getItem(decisionKey) ?? "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) setDecisions(saved);
    } catch { setStatus("Nie udało się odczytać zapisanych decyzji."); }
  }, []);

  function saveFlags(next: ProposalFlags) {
    document.cookie = `${PROPOSAL_COOKIE}=${localProposals.filter(({ id }) => next[id]).map(({ id }) => id).join(",")}; Path=/; SameSite=Lax; Max-Age=2592000`;
    setFlags(next);
    setStatus("Podgląd zapisany. Otwórz wybraną stronę lub odśwież już otwartą kartę.");
  }

  function decide(id: ProposalId, value: Decision) {
    const next = { ...decisions, [id]: value };
    setDecisions(next);
    try { localStorage.setItem(decisionKey, JSON.stringify(next)); }
    catch { setStatus("Pamięć przeglądarki jest niedostępna. Decyzja obowiązuje tylko do odświeżenia."); }
  }

  function previewPending(select: (id: ProposalId) => boolean) {
    saveFlags({ ...flags, ...Object.fromEntries(localProposals.map(({ id }) => [id, select(id)])) });
  }

  function exportDecisions() {
    const data = reviewedProposals.map(({ id, title }) => ({ id, title, preview: flags[id], decision: acceptedProposalIds.includes(id) ? "keep" : rejectedProposalIds.includes(id) ? "drop" : decisions[id] ?? "pending" }));
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "decyzje-zmiany-krdig.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="proposal-panel">
      <a href="/">Powrót do serwisu</a>
      <p className="article-kicker">Tylko lokalnie</p>
      <h1>Pozostałe decyzje</h1>
      <p>Zaakceptowane: {acceptedProposalIds.length}. Odrzucone: {rejectedProposalIds.length}. Do decyzji: {localProposals.length}.</p>
      <fieldset disabled={!ready} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <div className="proposal-actions">
        <button type="button" onClick={() => previewPending(() => true)}>Włącz pozostałe propozycje</button>
        <button type="button" onClick={() => previewPending(() => false)}>Tylko wdrożone zmiany</button>
        <button type="button" onClick={() => previewPending((id) => decisions[id] === "keep")}>Podgląd kolejnych akceptacji</button>
        <button type="button" onClick={exportDecisions}>Pobierz decyzje</button>
      </div>
      <p role="status">{status || "Wybierz propozycje do obejrzenia."}</p>
      {[...new Set(localProposals.map(({ group }) => group))].map((group) => (
        <section key={group}>
          <h2>{group}</h2>
          {localProposals.filter((proposal) => proposal.group === group).map((proposal) => (
            <div className="proposal-row" key={proposal.id}>
              <label><input type="checkbox" checked={flags[proposal.id]} onChange={(event) => saveFlags({ ...flags, [proposal.id]: event.target.checked })} /> <strong>{proposal.title}</strong><span>{proposal.detail}</span></label>
              <label className="proposal-decision">Decyzja<select aria-label={`Decyzja: ${proposal.title}`} value={decisions[proposal.id] ?? "pending"} onChange={(event) => decide(proposal.id, event.target.value as Decision)}><option value="pending">Do decyzji</option><option value="keep">Zostaje</option><option value="drop">Rezygnuję</option></select></label>
              <a href={proposal.href}>Otwórz podgląd →</a>
            </div>
          ))}
        </section>
      ))}
      </fieldset>
      <section>
        <h2>Zaakceptowane i utrwalone</h2>
        <ul>{reviewedProposals.filter(({ id }) => acceptedProposalIds.includes(id)).map(({ id, title }) => <li key={id}>{title}</li>)}</ul>
        <h2>Odrzucone</h2>
        <ul>{reviewedProposals.filter(({ id }) => rejectedProposalIds.includes(id)).map(({ id, title }) => <li key={id}>{title}</li>)}</ul>
      </section>
      <section>
        <h2>Materiały do zatwierdzenia</h2>
        <ul>
          <li>Telefony zespołu, adres administratora, składy i zadania komisji.</li>
          <li>Aktualne dane krajów trzecich.</li>
          <li>Weryfikacja dostępności PDF i okładki e-booka; potwierdzone docelowe adresy niedziałających witryn kampanii.</li>
          <li>Docelowa domena SEO.</li>
        </ul>
        <p>Te materiały nadal wymagają zatwierdzenia merytorycznego.</p>
      </section>
      <section><h2>SEO</h2><a href="/podglad-zmian/seo">Edytuj lokalne propozycje tytułu i opisu SEO →</a></section>
    </main>
  );
}