import repairs from "../data/tender-attachment-repairs.json";
import type { NewsPost } from "./content";

type Attachment = { href: string; size: number; sha256: string; downloadedFrom: string };
const assets: Record<string, Attachment> = repairs.assets;
const sourceParagraphs: Record<string, { id: number; paragraphs: string[] }> = repairs.posts;

function restoredHref(href: string) {
  if (!/^https?:\/\/|^\//i.test(href)) return href;
  const url = new URL(href, "https://krd-ig.com.pl");
  if (/^(?:www\.|old\.)?krd-ig\.com\.pl$/i.test(url.hostname)) {
    url.protocol = "https:";
    url.hostname = "krd-ig.com.pl";
  }
  return assets[url.href]?.href ?? href;
}

export function restoreTenderAttachments(post: NewsPost): NewsPost {
  if (post.managed) return post;
  const source = sourceParagraphs[post.slug];
  const paragraphs = source?.id === post.id ? source.paragraphs : post.paragraphs;
  return {
    ...post,
    paragraphs: paragraphs.map(text => text.replace(
      /\]\(([^)]+)\)/g,
      (_match, href: string) => `](${restoredHref(href)})`,
    )),
    links: post.links.map(link => ({ ...link, href: restoredHref(link.href) })),
  };
}
