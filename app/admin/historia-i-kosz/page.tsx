import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import { cmsFlag, type CmsSafetyEnvironment } from "../../lib/cms-safety-flags";
import ContentHistoryManager from "./ContentHistoryManager";

export default async function ContentHistoryPage() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (session?.role !== "admin") redirect("/login/czlonkowie?redirect=/admin/historia-i-kosz");
  const environment = (globalThis as typeof globalThis & { env?: CmsSafetyEnvironment }).env;
  const historyEnabled = cmsFlag(environment?.CMS_HISTORY_ENABLED);
  const trashEnabled = cmsFlag(environment?.CMS_TRASH_ENABLED);
  if (!historyEnabled && !trashEnabled) notFound();
  return <PageShell><section className="simple-hero"><div className="shell" style={{ maxWidth: 1200, paddingTop: 48, paddingBottom: 56 }}>
    <p className="article-kicker">Administrator · etap 2</p><h1>Historia zmian i kosz</h1>
    <p><a href="/member/profil">← Wróć do panelu administratora</a></p>
    <ContentHistoryManager historyEnabled={historyEnabled} trashEnabled={trashEnabled} />
  </div></section></PageShell>;
}
