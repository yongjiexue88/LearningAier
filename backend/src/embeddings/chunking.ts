export interface Chunk {
  position: number;
  text: string;
  language: "zh" | "en" | "mixed";
}

export interface ChunkOptions {
  targetSize?: number;
  overlap?: number;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  targetSize: 900, // ~250 tokens
  overlap: 120,
};

export function chunkBilingualMarkdown(
  content: { zh?: string; en?: string },
  options: ChunkOptions = {}
): Chunk[] {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const buffers: Chunk[] = [];
  let position = 0;

  if (content.zh) {
    buffers.push(
      ...chunkSingleLanguage(content.zh, "zh", config, () => position++)
    );
  }
  if (content.en) {
    buffers.push(
      ...chunkSingleLanguage(content.en, "en", config, () => position++)
    );
  }

  return buffers.sort((a, b) => a.position - b.position);
}

function chunkSingleLanguage(
  text: string,
  language: "zh" | "en",
  options: Required<ChunkOptions>,
  nextPosition: () => number
): Chunk[] {
  const normalized = normalizeMarkdown(text);
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  let current = "";

  const pushCurrent = () => {
    if (!current.trim()) return;
    chunks.push({
      position: nextPosition(),
      text: current.trim(),
      language,
    });
    current = "";
  };

  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length > options.targetSize) {
      pushCurrent();
      if (paragraph.length > options.targetSize) {
        const slices = slidingWindow(paragraph, options.targetSize, options.overlap);
        for (const slice of slices) {
          current = slice;
          pushCurrent();
        }
        current = "";
        continue;
      }
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  pushCurrent();

  return chunks;
}

function slidingWindow(text: string, size: number, overlap: number): string[] {
  const slices: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    slices.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return slices;
}

function normalizeMarkdown(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\t/g, "  ").trim();
}
