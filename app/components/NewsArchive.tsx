"use client";

import { useMemo, useState } from "react";
import { withBasePath } from "../lib/basePath";

type ArchivePost = {
  slug: string;
  title: string;
  date: string;
  year: number;
  excerpt: string;
  categories: string[];
  image: string | null;
};

export function NewsArchive({
  posts,
  forceContainImages = false,
}: {
  posts: ArchivePost[];
  forceContainImages?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Wszystkie");
  const [year, setYear] = useState("Wszystkie");
  const [limit, setLimit] = useState(36);

  const categoryOrder = [
    "Wszystkie",
    "Zapytania ofertowe",
    "Zaproszenie do składania ofert",
    "Wybór wykonawcy",
    "Wyniki postępowania",
    "Informacja o unieważnieniu",
  ];

  const categories = useMemo(
    () => {
      const filteredCategories = Array.from(
        new Set(
          posts
            .flatMap((post) => post.categories)
            .filter(
              (category) =>
                category &&
                !/^Aktualności$/i.test(category.trim()) &&
                !/^Wydarzenia$/i.test(category.trim()),
            ),
        ),
      );

      const ordered = categoryOrder.concat(
        filteredCategories.filter((category) => !categoryOrder.includes(category)),
      );

      return ordered.filter((value, index, list) => list.indexOf(value) === index);
    },
    [posts],
  );
  const years = useMemo(
    () => [
      "Wszystkie",
      ...Array.from(new Set(posts.map((post) => String(post.year)))).sort(
        (a, b) => Number(b) - Number(a),
      ),
    ],
    [posts],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLocaleLowerCase("pl").trim();
    return posts.filter((post) => {
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
  }, [posts, query, category, year]);

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
          <article
            className={`archive-card${post.slug === "nowy-link-zsrir-w-zakladce-dokumenty" ? " archive-card-zsrir" : ""}`}
            key={post.slug}
          >
            {post.image ? (
              <img
                src={withBasePath(post.image)}
                alt=""
                loading="lazy"
                className={
                  forceContainImages ||
                  post.slug === "polska-odzyskala-status-kraju-wolnego-od-grypy-ptakow-2026"
                    ? "archive-image-contain"
                    : post.slug === "nowy-link-zsrir-w-zakladce-dokumenty"
                      ? "archive-image-contain archive-image-zsrir"
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
