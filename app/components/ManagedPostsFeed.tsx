"use client";
import { useEffect, useState } from "react";

type Post = { slug: string; title: string; excerpt: string; paragraphs: string[]; categories: string[]; image: string | null; date: string };

export function ManagedPostsFeed({ kind }: { kind: "news" | "tender" }) {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => { void fetch(`/api/managed-posts?kind=${kind}`).then((response) => response.ok ? response.json() : null).then((data: { posts?: Post[] } | null) => setPosts(data?.posts ?? [])).catch(() => undefined); }, [kind]);
  if (!posts.length) return null;
  return <section className="archive-section"><div className="shell"><div className="archive-grid">{posts.map((post) => <article className="archive-card" key={post.slug}>
    {post.image ? <img src={post.image} alt="" loading="lazy" className="archive-image-contain" /> : <div className="archive-placeholder">KRD-IG</div>}
    <div><div className="archive-meta"><time>{new Date(post.date).toLocaleDateString("pl-PL")}</time><span>{post.categories[0]}</span></div><h2>{post.title}</h2><p>{post.excerpt}</p>{post.paragraphs.slice(0, 1).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
  </article>)}</div></div></section>;
}