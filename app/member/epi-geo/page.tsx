import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ArticleBody } from "../../components/ArticleBody";
import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import { pageBySlug } from "../../lib/content";
import ExportMemberDocumentsButton from "../dokumenty/ExportMemberDocumentsButton";
import MemberDocumentsList from "../dokumenty/MemberDocumentsList";

export default async function MemberEpiGeoPage() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login/czlonkowie?redirect=/member/epi-geo");
  }

  const page = pageBySlug("dla-czlonkow");

  if (!page) {
    redirect("/member/profil");
  }

  const isAdmin = session.role === "admin";

  return (
    <PageShell>
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <a
              href="/member/profil"
              style={{ display: "inline-flex", marginBottom: 24, color: "#1f3a5f", fontWeight: 700, textDecoration: "none" }}
            >
              Powrót
            </a>
            <p className="article-kicker">{page.section}</p>
            <h1>{page.title}</h1>
            {page.excerpt ? <p className="article-lead">{page.excerpt}</p> : null}
          </div>
        </div>
      </section>
      <ArticleBody paragraphs={page.paragraphs} links={page.links} source={page.source} slug={page.slug} />
      <section className="simple-hero">
        <div className="shell" style={{ maxWidth: 860, paddingTop: 24, paddingBottom: 56 }}>
          {isAdmin ? <ExportMemberDocumentsButton scope="epi-geo" /> : null}
          <MemberDocumentsList scope="epi-geo" />
        </div>
      </section>
    </PageShell>
  );
}