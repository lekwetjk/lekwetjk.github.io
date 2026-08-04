import { ArticleBody } from "../../components/ArticleBody";
import { PageShell } from "../../components/SiteChrome";
import { formatDate, postBySlug } from "../../lib/content";

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = postBySlug(slug);

  if (!post) {
    return (
      <PageShell>
        <section className="simple-hero">
          <div className="shell">
            <h1>Nie znaleziono materiału</h1>
            <a href="/aktualnosci">Wróć do archiwum</a>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <p className="article-kicker">
              {post.categories.join(" · ")} · {formatDate(post.date)}
            </p>
            <h1>{post.title}</h1>
            {post.excerpt && <p>{post.excerpt}</p>}
          </div>
          {post.image && <img src={post.image} alt="" />}
        </div>
      </section>
      <ArticleBody
        paragraphs={post.paragraphs}
        links={post.links}
        source={post.source}
      />
    </PageShell>
  );
}
