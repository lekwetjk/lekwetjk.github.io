"use client";

import { useEffect, useMemo, useState } from "react";
import { withBasePath } from "../lib/basePath";

type ArchivePost = {
  slug: string;
  title: string;
  date: string;
  year: number;
  excerpt: string;
  categories: string[];
  image: string | null;
  imageFit?: "contain" | "cover";
};

export function NewsArchive({
  posts,
  forceContainImages = false,
  managedKind,
}: {
  posts: ArchivePost[];
  forceContainImages?: boolean;
  managedKind?: "news" | "tender";
}) {
  const [allPosts, setAllPosts] = useState(posts);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Wszystkie");
  const [year, setYear] = useState("Wszystkie");
  const [limit, setLimit] = useState(36);

  useEffect(() => {
    let active = true;
    setAllPosts(posts);
    if (!managedKind) return;
    void fetch(`/api/managed-posts?kind=${managedKind}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data: { posts?: ArchivePost[]; deletedSlugs?: string[] } | null) => {
        if (!active || !data?.posts) return;
        setAllPosts([...data.posts, ...posts]
          .filter((post) => !data.deletedSlugs?.includes(post.slug))
          .filter((post, index, list) => list.findIndex((item) => item.slug === post.slug) === index)
          .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [managedKind, posts]);

  const categories = useMemo(
    () => [
      "Wszystkie",
      ...Array.from(new Set(allPosts.flatMap((post) => post.categories))).sort(
        (a, b) => a.localeCompare(b, "pl"),
      ),
    ],
    [allPosts],
  );
  const years = useMemo(
    () => [
      "Wszystkie",
      ...Array.from(new Set(allPosts.map((post) => String(post.year)))).sort(
        (a, b) => Number(b) - Number(a),
      ),
    ],
    [allPosts],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLocaleLowerCase("pl").trim();
    return allPosts.filter((post) => {
      const matchesQuery =
        !normalizedQuery ||
        `${post.title} ${post.excerpt}`
          .toLocaleLowerCase("pl")
          .includes(normalizedQuery);
      const matchesCategory =
        category === "Wszystkie" || post.categories.includes(category);
      const matchesYear = year === "Wszystkie" || String(post.year) === year;
      return matchesQuery && matchesCategory && matchesYear;
    });
  }, [allPosts, query, category, year]);

  return (
    <>
      <div className="archive-filters">
        <label>
          <span>Szukaj</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(36);
            }}
            placeholder="Tytuł, temat lub słowo kluczowe"
          />
        </label>
        <label>
          <span>Kategoria</span>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setLimit(36);
            }}
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Rok</span>
          <select
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              setLimit(36);
            }}
          >
            {years.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="archive-count">
        Znaleziono: <strong>{filtered.length}</strong>
      </p>

      <div className="archive-grid">
        {filtered.slice(0, limit).map((post) => (
          <article className="archive-card" key={post.slug}>
            {post.image ? (
              <img
                src={withBasePath(post.image)}
                alt=""
                loading="lazy"
                style={post.imageFit ? { objectFit: post.imageFit, objectPosition: "center", padding: post.imageFit === "contain" ? 16 : 0 } : undefined}
                className={
                  post.imageFit === "contain" || forceContainImages ||
                  post.slug === "polska-odzyskala-status-kraju-wolnego-od-grypy-ptakow-2026"
                    ? "archive-image-contain"
                    : undefined
                }
              />
            ) : (
              <div className="archive-placeholder" aria-hidden="true">
                KRD-IG
              </div>
            )}
            <div>
              <div className="archive-meta">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span>{post.categories[0] || "Aktualności"}</span>
              </div>
              <h2>
                <a href={withBasePath(`/aktualnosci/${post.slug}`)}>{post.title}</a>
              </h2>
              <p>{post.excerpt}</p>
            </div>
          </article>
        ))}
      </div>

      {limit < filtered.length && (
        <button
          className="button button-outline load-more"
          type="button"
          onClick={() => setLimit((current) => current + 36)}
        >
          Pokaż kolejne materiały
        </button>
      )}
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
