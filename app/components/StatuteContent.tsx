import type { ReactNode } from "react";

type ListStyle = "subsection" | "point" | "letter";
type StatuteListItem = { marker: string; blocks: StatuteBlock[] };
type StatuteBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; className: string }
  | { type: "list"; style: ListStyle; items: StatuteListItem[] };

function splitLetterList(paragraph: string): string[] {
  const markers = [...paragraph.matchAll(/(?:^|\s)([a-z]\))\s+/g)];
  const first = markers[0];
  if (
    markers.length < 2 ||
    first[1] !== "a)" ||
    (first.index > 0 && !paragraph.slice(0, first.index).trimEnd().endsWith(":")) ||
    markers.some((marker, index) => marker[1] !== `${String.fromCharCode(97 + index)})`)
  ) {
    return [paragraph];
  }

  const positions = markers.map(marker => marker.index + marker[0].indexOf(marker[1]));
  const introduction = paragraph.slice(0, positions[0]).trimEnd();
  return [
    ...(introduction ? [introduction] : []),
    ...positions.map((position, index) => paragraph.slice(position, positions[index + 1]).trim()),
  ];
}

function parseStatute(paragraphs: string[]): StatuteBlock[] {
  const blocks: StatuteBlock[] = [];
  let subsection: StatuteListItem | undefined;
  let point: StatuteListItem | undefined;
  let letter: StatuteListItem | undefined;
  let expectChapterTitle = false;

  const expandedParagraphs = paragraphs.flatMap(paragraph => {
    const trailingSection = paragraph.match(/^([\s\S]*[.!?])\s+(\u00a7\s*\d+)\s*$/);
    return trailingSection ? [trailingSection[1], trailingSection[2]] : [paragraph];
  }).flatMap(splitLetterList);

  for (const paragraph of expandedParagraphs) {
    const isSection = /^\s*\u00a7\s*\d+\s*$/.test(paragraph);
    const isChapter = /^Rozdzia\u0142\s+[IVX]+$/i.test(paragraph);
    const isOrganHeading = /^[\u201e"][A-E][\u201d"]\.?\s+/.test(paragraph);
    if (isSection || isChapter || isOrganHeading || expectChapterTitle || /^Statut\s/.test(paragraph)) {
      const className = isSection ? "statut-section-heading"
        : isChapter ? "statut-chapter-heading"
        : isOrganHeading ? "statut-organ-heading" : "statut-title-heading";
      blocks.push({ type: "heading", text: paragraph, className });
      subsection = point = letter = undefined;
      expectChapterTitle = isChapter;
      continue;
    }

    const subsectionMatch = paragraph.match(/^\s*(\d+\.)\s+([\s\S]+)$/);
    const pointMatch = paragraph.match(/^\s*(\d+\))\s+([\s\S]+)$/);
    const letterMatch = paragraph.match(/^\s*([a-z]\))\s+([\s\S]+)$/);
    const match = subsectionMatch ?? pointMatch ?? letterMatch;
    if (match) {
      const style: ListStyle = subsectionMatch ? "subsection" : pointMatch ? "point" : "letter";
      const parent = style === "subsection" ? blocks
        : style === "point" ? subsection?.blocks ?? blocks
        : point?.blocks ?? subsection?.blocks ?? blocks;
      let list = parent[parent.length - 1];
      if (list?.type !== "list" || list.style !== style) {
        list = { type: "list", style, items: [] };
        parent.push(list);
      }
      const item: StatuteListItem = {
        marker: match[1],
        blocks: [{ type: "paragraph", text: match[2] }],
      };
      list.items.push(item);
      if (style === "subsection") {
        subsection = item;
        point = letter = undefined;
      } else if (style === "point") {
        point = item;
        letter = undefined;
      } else {
        letter = item;
      }
      continue;
    }

    const parent = letter ?? point ?? subsection;
    (parent?.blocks ?? blocks).push({ type: "paragraph", text: paragraph });
  }
  return blocks;
}

function renderBlocks(blocks: StatuteBlock[]): ReactNode {
  return blocks.map((block, index) => {
    if (block.type === "heading") {
      return <h2 className={block.className} key={index}>{block.text}</h2>;
    }
    if (block.type === "paragraph") {
      return <p key={index}>{block.text}{" "}</p>;
    }
    return (
      <ol className={`statut-list statut-list-${block.style}`} role="list" key={index}>
        {block.items.map((item, itemIndex) => (
          <li
            key={itemIndex}
            value={block.style === "letter" ? item.marker.charCodeAt(0) - 96 : Number.parseInt(item.marker, 10)}
          >
            <span className="statut-item-marker">{item.marker}{" "}</span>
            <div className="statut-item-content">{renderBlocks(item.blocks)}</div>
          </li>
        ))}
      </ol>
    );
  });
}

export function StatuteContent({ paragraphs }: { paragraphs: string[] }) {
  return renderBlocks(parseStatute(paragraphs));
}
