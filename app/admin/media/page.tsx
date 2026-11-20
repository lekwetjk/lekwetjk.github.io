import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import { mediaLibraryEnabled } from "../../lib/media-library";
import MediaBrowser from "./MediaBrowser";

export default async function MediaLibraryPage() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (session?.role !== "admin") redirect("/login/czlonkowie?redirect=/admin/media");
  if (!mediaLibraryEnabled()) notFound();
  return <PageShell><section className="simple-hero"><div className="shell" style={{ maxWidth: 1200, paddingTop: 48, paddingBottom: 56 }}>
    <p className="article-kicker">Administrator · etap 3</p><h1>Biblioteka mediów</h1>
    <p><a href="/member/profil">← Wróć do panelu administratora</a> · <a href="/admin/publikacje">Publikacje</a> · <a href="/admin/historia-i-kosz">Historia zmian i kosz</a></p>
    <MediaBrowser />
  </div></section></PageShell>;
}
