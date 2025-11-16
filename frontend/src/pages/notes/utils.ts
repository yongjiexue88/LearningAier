export interface FolderRecord {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

export interface FolderNode extends FolderRecord {
  children: FolderNode[];
  depth: number;
  noteCount: number;
}

export function buildFolderTree(
  folders: FolderRecord[],
  noteCounts: Record<string, number>,
  parentId: string | null = null,
  depth = 0
): FolderNode[] {
  return folders
    .filter((folder) => folder.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((folder) => ({
      ...folder,
      depth,
      noteCount: noteCounts[folder.id] ?? 0,
      children: buildFolderTree(folders, noteCounts, folder.id, depth + 1),
    }));
}

export function computeSortOrder(before?: number, after?: number): number {
  if (before === undefined && after === undefined) {
    return Date.now();
  }
  if (before === undefined) {
    return (after ?? 0) - 1;
  }
  if (after === undefined) {
    return before + 1;
  }
  if (before === after) {
    return before + 0.5;
  }
  return before + (after - before) / 2;
}

export function isDescendant(
  folders: FolderRecord[],
  potentialParentId: string,
  childId: string
): boolean {
  const parentMap = new Map<string, string | null>();
  folders.forEach((folder) => parentMap.set(folder.id, folder.parent_id));
  let current: string | null | undefined = potentialParentId;
  while (current) {
    if (current === childId) return true;
    current = parentMap.get(current) ?? null;
  }
  return false;
}

export function computeWordStats(content: string): {
  wordCount: number;
  readingTimeSeconds: number;
} {
  const zhLike = (content.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const enLike = content
    .replace(/[\u4e00-\u9fa5]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const total = zhLike + enLike;
  const readingMinutes = Math.max(1, Math.ceil(total / 250 || 1));
  return {
    wordCount: total,
    readingTimeSeconds: readingMinutes * 60,
  };
}

export interface OutlineHeading {
  id: string;
  text: string;
  level: number;
}

export function extractHeadings(markdown: string): OutlineHeading[] {
  const lines = markdown.split("\n");
  const headings: OutlineHeading[] = [];
  const slugCounts = new Map<string, number>();
  lines.forEach((line) => {
    const match = /^(#{1,6})\s+(.*)/.exec(line.trim());
    if (!match) return;
    const level = match[1].length;
    const rawText = match[2].trim();
    const slugBase = slugify(rawText);
    const count = slugCounts.get(slugBase) ?? 0;
    slugCounts.set(slugBase, count + 1);
    const slug = count > 0 ? `${slugBase}-${count}` : slugBase;
    headings.push({ id: slug, text: rawText, level });
  });
  return headings;
}

export function formatReadingTime(seconds: number): string {
  if (!seconds || seconds <= 60) {
    return "≈1 min";
  }
  const minutes = Math.round(seconds / 60);
  return `≈${minutes} min`;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "heading"
  );
}

interface NoteProcessorSummary {
  summary: { zh: string; en: string };
  bullet_notes: {
    zh: { title: string; children: string[] }[];
    en: { title: string; children: string[] }[];
  };
  terminology: {
    term_zh: string | null;
    term_en: string | null;
    definition_zh: string;
    definition_en: string;
  }[];
}

export function noteProcessorResultToMarkdown(
  payload: NoteProcessorSummary,
  language: "zh" | "en"
): string {
  const summary = payload.summary?.[language] ?? "";
  const bullets = payload.bullet_notes?.[language] ?? [];
  const terminology = payload.terminology ?? [];

  const lines: string[] = [];
  lines.push(`# 摘要 / Summary`);
  lines.push(summary.trim());
  lines.push("");
  lines.push(`# 重点 / Key Points`);
  bullets.forEach((node) => {
    lines.push(`## ${node.title}`);
    node.children.forEach((item) => {
      lines.push(`- ${item}`);
    });
    lines.push("");
  });
  if (terminology.length) {
    lines.push(`# Terminology`);
    terminology.forEach((term) => {
      const termLabel =
        language === "zh"
          ? term.term_zh ?? term.term_en ?? "术语"
          : term.term_en ?? term.term_zh ?? "Term";
      const def =
        language === "zh" ? term.definition_zh : term.definition_en;
      lines.push(`### ${termLabel}`);
      lines.push(def);
      lines.push("");
    });
  }
  return lines.join("\n").trim();
}
