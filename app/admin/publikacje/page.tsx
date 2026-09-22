import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import PublicationForm from "./PublicationForm";
import ManagedPostsManager from "./ManagedPostsManager";

export default async function PublicationsAdminPage() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") redirect("/login/czlonkowie?redirect=/admin/publikacje");
  return <PageShell><section className="simple-hero"><div className="shell" style={{ maxWidth: 1100, paddingTop: 56, paddingBottom: 56 }}><p className="article-kicker">Administrator</p><h1>Publikacje</h1><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 18 }}><PublicationForm kind="news" /><PublicationForm kind="tender" /></div><ManagedPostsManager /></div></section></PageShell>;
}