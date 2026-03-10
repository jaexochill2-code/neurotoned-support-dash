import fs from "fs/promises";
import path from "path";

const dataFilePath = path.join(process.cwd(), "data", "sops.json");
const kbDirectoryPath = path.join(process.cwd(), "data", "kb");

let cachedContext: string | null = null;

/** Load KB + SOPs from disk (cached after first call) */
export async function getKbContext(): Promise<string> {
  if (cachedContext) return cachedContext;

  let ctx = "";

  try {
    const data = await fs.readFile(dataFilePath, "utf8");
    if (data) ctx += "\n# Base Guidelines\n" + (JSON.parse(data).sops || "") + "\n";
  } catch {
    // sops.json might not exist — that's fine
  }

  try {
    const files = await fs.readdir(kbDirectoryPath);
    const valid = files.filter(f => f.endsWith(".md") || f.endsWith(".txt"));

    const contents = await Promise.all(
      valid.map(async (file) => {
        const content = await fs.readFile(path.join(kbDirectoryPath, file), "utf8");
        const title = file.replace(/\.(md|txt)$/, "").replace(/-/g, " ").toUpperCase();
        return `\n\n--- KB DOCUMENT: ${title} ---\n${content}\n`;
      })
    );
    ctx += contents.join("");
  } catch {
    // No KB directory — non-fatal
  }

  cachedContext = ctx;
  return cachedContext;
}

/** Bust the cache — call after KB create/update/delete */
export function invalidateKbCache(): void {
  cachedContext = null;
}

// Pre-warm cache on module load (non-blocking)
getKbContext().catch(() => {});
