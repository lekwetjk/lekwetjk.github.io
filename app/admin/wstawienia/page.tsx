import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import WstawieniaEditor from "./WstawieniaEditor";

export default async function AdminWstawieniaPage() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") redirect("/login/czlonkowie?redirect=/admin/wstawienia");

  return <PageShell><section className="simple-hero"><div className="shell" style={{ maxWidth: 1400, paddingTop: 56, paddingBottom: 56 }}><p className="article-kicker">Administracja</p><h1>Wstawienia</h1><p>Edytuj dane roczne lub zaimportuj arkusz CSV. Eksport zawiera całą aktualną tabelę.</p><WstawieniaEditor /></div></section></PageShell>;
}