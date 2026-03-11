import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs/promises";
import path from "path";
import { invalidateKbCache } from "@/lib/kb-cache";

const kbDirectory = path.join(process.cwd(), "data", "kb");

async function ensureKbDir() {
  try {
    await fs.access(kbDirectory);
  } catch {
    await fs.mkdir(kbDirectory, { recursive: true });
  }
}

/** Parse YAML-style frontmatter from a markdown string. */
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) meta[key.trim()] = rest.join(":").trim();
  }
  return { meta, body: match[2] };
}

function buildFrontmatter(meta: Record<string, string>): string {
  const lines = Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join("\n");
  return `---\n${lines}\n---\n`;
}

// GET: List all knowledge base files with category/brand metadata
export async function GET() {
  await ensureKbDir();
  try {
    const files = await fs.readdir(kbDirectory);
    const kbFiles = [];

    for (const file of files) {
      // Hide internal system documents from the UI
      if ((file.endsWith(".md") || file.endsWith(".txt")) && file !== "neurotoned-sitemap.md") {
        const filePath = path.join(kbDirectory, file);
        const stats = await fs.stat(filePath);
        const raw = await fs.readFile(filePath, "utf-8");
        const { meta, body } = parseFrontmatter(raw);

        kbFiles.push({
          id: file,
          title: meta.title || file.replace(/\.(md|txt)$/, "").replace(/-/g, " "),
          category: meta.category || "General",
          brand: meta.brand || "All",
          content: body.trim(),
          updatedAt: stats.mtime,
        });
      }
    }

    // Sort by category, then title
    kbFiles.sort((a, b) => {
      const catComp = a.category.localeCompare(b.category);
      return catComp !== 0 ? catComp : a.title.localeCompare(b.title);
    });

    return NextResponse.json({ files: kbFiles });
  } catch (error) {
    console.error("Failed to read KB directory", error);
    return NextResponse.json({ error: "Failed to read Knowledge Base" }, { status: 500 });
  }
}

// POST: Create or Update a KB file with frontmatter
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("neurotoned_admin_token")?.value;
  if (token !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureKbDir();
  try {
    const { title, content, category, brand, originalId } = await req.json();

    if (!title || content === undefined) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }
    if (typeof content === "string" && content.length > 100_000) {
      return NextResponse.json({ error: "KB file content is too large (max 100KB)." }, { status: 400 });
    }
    if (typeof title === "string" && title.length > 200) {
      return NextResponse.json({ error: "Title is too long (max 200 chars)." }, { status: 400 });
    }

    if (originalId === "neurotoned-sitemap.md") {
      return NextResponse.json({ error: "Cannot modify protected system files" }, { status: 403 });
    }

    const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const filename = `${sanitizedTitle}.md`;
    const filePath = path.join(kbDirectory, filename);

    if (originalId && originalId !== filename) {
      try { await fs.unlink(path.join(kbDirectory, originalId)); } catch {}
    }

    const meta: Record<string, string> = {
      title,
      category: category || "General",
      brand: brand || "All",
    };

    await fs.writeFile(filePath, buildFrontmatter(meta) + content, "utf-8");
    invalidateKbCache();
    return NextResponse.json({ success: true, id: filename });
  } catch (error) {
    console.error("Failed to write KB file", error);
    return NextResponse.json({ error: "Failed to save Knowledge Base file" }, { status: 500 });
  }
}

// DELETE: Remove a specific KB file
export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("neurotoned_admin_token")?.value;
  if (token !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureKbDir();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || id.includes("..") || id.includes("/")) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }
    
    if (id === "neurotoned-sitemap.md") {
      return NextResponse.json({ error: "Cannot delete protected system file" }, { status: 403 });
    }

    await fs.unlink(path.join(kbDirectory, id));
    invalidateKbCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete KB file", error);
    return NextResponse.json({ error: "Failed to delete Knowledge Base file" }, { status: 500 });
  }
}
