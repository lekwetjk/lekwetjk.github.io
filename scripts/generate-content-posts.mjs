import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentSources = [
  { dir: path.join(__dirname, "..", "content", "aktualnosci"), defaultCategory: "Aktualności" },
  { dir: path.join(__dirname, "..", "content", "zapytania-ofertowe"), defaultCategory: "Zapytania ofertowe" },
];
const outputFile = path.join(__dirname, "..", "app", "data", "generated-posts.json");

function slugify(value) {
  return value
    .toLocaleLowerCase("pl")
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ż|ź/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashId(slug) {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  return 700000 + (hash % 90000);
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Brak sekcji frontmatter (--- ... ---) na początku pliku.");
  }

  const [, frontmatterBlock, body] = match;
  const data = {};
  let currentListKey = null;
  let currentListItem = null;

  for (const line of frontmatterBlock.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const listItemMatch = line.match(/^\s*-\s*(?:(\w+):\s*(.*))?$/);
    if (currentListKey && line.match(/^\s+/)) {
      const itemFieldMatch = line.match(/^\s*(\w+):\s*(.*)$/);
      if (line.match(/^\s*-\s/)) {
        if (currentListItem) {
          data[currentListKey].push(currentListItem);
        }
        currentListItem = {};
        const inlineFieldMatch = line.match(/^\s*-\s*(\w+):\s*(.*)$/);
        if (inlineFieldMatch) {
          currentListItem[inlineFieldMatch[1]] = inlineFieldMatch[2].trim();
        }
        continue;
      }
      if (itemFieldMatch && currentListItem) {
        currentListItem[itemFieldMatch[1]] = itemFieldMatch[2].trim();
        continue;
      }
    }

    if (listItemMatch === null || !line.match(/^\s+/)) {
      if (currentListKey && currentListItem) {
        data[currentListKey].push(currentListItem);
        currentListItem = null;
      }
      currentListKey = null;
    }

    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!keyMatch) {
      continue;
    }

    const [, key, value] = keyMatch;
    if (value === "" || value === undefined) {
      data[key] = [];
      currentListKey = key;
      currentListItem = null;
    } else {
      data[key] = value.trim();
    }
  }

  if (currentListKey && currentListItem) {
    data[currentListKey].push(currentListItem);
  }

  return { data, body: body.trim() };
}

function toParagraphs(body) {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/\r?\n/g, " ").trim())
    .filter(Boolean);
}

async function collectPosts(contentDir, defaultCategory) {
  let files = [];
  try {
    files = await readdir(contentDir);
  } catch {
    return [];
  }

  const postFiles = files.filter(
    (file) => file.endsWith(".md") && !file.startsWith("_") && file.toLowerCase() !== "readme.md",
  );

  const posts = [];

  for (const file of postFiles) {
    const raw = await readFile(path.join(contentDir, file), "utf8");
    const { data, body } = parseFrontmatter(raw);

    if (!data.title || !data.date) {
      throw new Error(`Plik ${file}: brak wymaganego pola "title" lub "date" w frontmatter.`);
    }

    const slug = data.slug ? slugify(data.slug) : slugify(data.title);
    const date = `${data.date}T00:00:00`;
    const year = Number(String(data.date).slice(0, 4));
    const categories = data.categories
      ? String(data.categories)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [defaultCategory];
    const links = Array.isArray(data.links)
      ? data.links
          .filter((item) => item.label && item.href)
          .map((item) => ({ href: item.href, label: item.label, document: true }))
      : [];

    posts.push({
      id: hashId(slug),
      slug,
      title: data.title,
      date,
      year,
      excerpt: data.excerpt || "",
      paragraphs: toParagraphs(body),
      links,
      categories,
      image: data.image || null,
      source: data.source || "",
    });
  }

  return posts;
}

async function generate() {
  const results = await Promise.all(
    contentSources.map(({ dir, defaultCategory }) => collectPosts(dir, defaultCategory)),
  );
  const posts = results.flat();

  posts.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  await writeFile(outputFile, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
  console.log(`Wygenerowano ${posts.length} wpis(ów) do ${path.relative(process.cwd(), outputFile)}.`);
}

generate().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
