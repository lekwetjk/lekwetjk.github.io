import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageShell } from "../../components/SiteChrome";
import { AuditLogFilterError, listAuditLogs, type AuditResult } from "../../lib/audit-log";
import { AUTH_COOKIE_NAME, type MemberRole, verifySessionToken } from "../../lib/auth";
import styles from "./AuditLog.module.css";
import PolishDatePicker from "./PolishDatePicker";

const EVENT_LABELS: Record<string, string> = {
  login: "Logowanie",
  logout: "Wylogowanie",
  password_change: "Zmiana hasła",
  password_reset: "Reset hasła",
  user_create: "Utworzenie użytkownika",
  user_update: "Edycja użytkownika",
  user_delete: "Usunięcie użytkownika",
  user_status: "Zmiana statusu użytkownika",
  user_import: "Import użytkowników",
  user_export: "Eksport użytkowników",
  user_report: "Raport użytkowników",
  user_profile_update: "Edycja profilu użytkownika",
  user_logo_delete: "Usunięcie logo",
  post_create: "Utworzenie publikacji",
  post_import: "Import publikacji",
  post_update: "Edycja publikacji",
  post_delete: "Usunięcie publikacji",
  report_create: "Utworzenie raportu",
  report_cancel: "Anulowanie tworzenia raportu",
  report_stage: "Przesyłanie danych raportu",
  report_delete: "Usunięcie raportu",
  document_upload: "Dodanie dokumentu",
  document_update: "Edycja dokumentu",
  document_delete: "Usunięcie dokumentu",
  document_export: "Eksport dokumentów",
  placements_update: "Edycja wstawień",
  placements_export: "Eksport wstawień",
  dictionary_create: "Dodanie wartości słownikowej",
  dictionary_update: "Edycja wartości słownikowej",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Warsaw" }).format(new Date(value));
}

function formatActivity(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours} godz. ${minutes} min` : `${minutes} min`;
}

function buildPageHref(filters: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  params.set("page", String(page));
  return `?${params.toString()}`;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") redirect("/login/czlonkowie?redirect=/admin/rejestr-logow");

  const raw = await searchParams;
  const value = (key: string) => typeof raw[key] === "string" ? raw[key] : undefined;
  const role = value("role");
  const result = value("result");
  const filters = {
    username: value("username"),
    role: role === "admin" || role === "member" ? role as MemberRole : undefined,
    result: result === "success" || result === "failure" ? result as AuditResult : undefined,
    eventType: value("eventType"),
    dateFrom: value("dateFrom"),
    dateTo: value("dateTo"),
    page: Number(value("page") ?? "1"),
  };
  let data: Awaited<ReturnType<typeof listAuditLogs>> | null = null;
  let loadError: string | null = null;
  try {
    data = await listAuditLogs(filters);
  } catch (error) {
    if (error instanceof AuditLogFilterError) {
      loadError = error.message;
    } else {
      console.error("Nie udało się odczytać rejestru logów.", error);
      loadError = "Nie udało się odczytać rejestru logów. Spróbuj ponownie później.";
    }
  }
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const hrefFilters = {
    username: filters.username,
    role: filters.role,
    result: filters.result,
    eventType: filters.eventType,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  return (
    <PageShell>
      <section className="simple-hero">
        <div className="shell" style={{ maxWidth: 1500, paddingTop: 56, paddingBottom: 56 }}>
          <a href="/member/profil" style={{ color: "#1f3a5f", fontWeight: 700, textDecoration: "none" }}>← Powrót do panelu</a>
          <p className="article-kicker" style={{ marginTop: 24 }}>Administracja</p>
          <h1>Rejestr logów</h1>
          <p>Logowania i aktywność członków oraz pełny rejestr działań administratorów.</p>

          <form method="get" className={styles.filters} aria-label="Filtry rejestru logów">
            <label>Użytkownik<input name="username" defaultValue={filters.username} placeholder="Login" /></label>
            <label>Rola<select name="role" defaultValue={filters.role ?? ""}><option value="">Wszystkie</option><option value="admin">Administrator</option><option value="member">Członek</option></select></label>
            <label>Wynik<select name="result" defaultValue={filters.result ?? ""}><option value="">Wszystkie</option><option value="success">Sukces</option><option value="failure">Niepowodzenie</option></select></label>
            <label>Zdarzenie<select name="eventType" defaultValue={filters.eventType ?? ""}><option value="">Wszystkie</option>{Object.entries(EVENT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <PolishDatePicker key={`dateFrom-${filters.dateFrom ?? ""}`} name="dateFrom" label="Od" defaultValue={filters.dateFrom} />
            <PolishDatePicker key={`dateTo-${filters.dateTo ?? ""}`} name="dateTo" label="Do" defaultValue={filters.dateTo} />
            <div className={styles.actions}><button className="button button-primary" type="submit">Filtruj</button><a className="button button-outline" href="/admin/rejestr-logow">Wyczyść</a></div>
          </form>

          {loadError ? <p role="alert" style={{ color: "#b91c1c" }}>{loadError}</p> : null}
          {data ? <>
          <div style={{ overflowX: "auto", border: "1px solid #d5d9df", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
              <thead><tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                {["Data i godzina", "Użytkownik", "Rola", "Zdarzenie", "Wynik", "Obiekt", "Czas aktywności", "Szczegóły"].map((heading) => <th key={heading} style={{ padding: 12 }}>{heading}</th>)}
              </tr></thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(entry.occurredAt)}</td>
                    <td style={{ padding: 12 }}>{entry.actorUsername}</td>
                    <td style={{ padding: 12 }}>{entry.actorRole === "admin" ? "Administrator" : entry.actorRole === "member" ? "Członek" : "Nieznana"}</td>
                    <td style={{ padding: 12 }}>{EVENT_LABELS[entry.eventType] ?? entry.eventType}</td>
                    <td style={{ padding: 12, color: entry.result === "success" ? "#166534" : "#b91c1c", fontWeight: 700 }}>{entry.result === "success" ? "Sukces" : "Niepowodzenie"}</td>
                    <td style={{ padding: 12 }}>{entry.targetType ? `${entry.targetType}: ${entry.targetId ?? "—"}` : "—"}</td>
                    <td style={{ padding: 12, whiteSpace: "nowrap" }} title={entry.lastActivityAt ? `Ostatnia aktywność: ${formatDate(entry.lastActivityAt)}${entry.endedAt ? ` · Wylogowanie: ${formatDate(entry.endedAt)}` : ""}` : undefined}>{entry.eventType === "login" && entry.result === "success" ? formatActivity(entry.activeSeconds) : "—"}</td>
                    <td style={{ padding: 12, maxWidth: 300, overflowWrap: "anywhere" }}>{Object.keys(entry.details).length ? JSON.stringify(entry.details) : "—"}</td>
                  </tr>
                ))}
                {!data.entries.length ? <tr><td colSpan={8} style={{ padding: 24, textAlign: "center" }}>Brak wpisów spełniających kryteria.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
            <span>Wpisy: {data.total}. Strona {data.page} z {totalPages}.</span>
            <div style={{ display: "flex", gap: 8 }}>
              {data.page > 1 ? <a className="button button-outline" href={buildPageHref(hrefFilters, data.page - 1)}>Poprzednia</a> : null}
              {data.page < totalPages ? <a className="button button-outline" href={buildPageHref(hrefFilters, data.page + 1)}>Następna</a> : null}
            </div>
          </div>
          </> : null}
        </div>
      </section>
    </PageShell>
  );
}
