import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const dataFilePath = path.join(process.cwd(), "data", "sops.json");

async function ensureDataPath() {
  const dir = path.dirname(dataFilePath);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const publicOnly = searchParams.get("public") === "1";

    await ensureDataPath();
    let parsed: any = { sops: "", urgentUpdate: "" };
    try {
      const data = await fs.readFile(dataFilePath, "utf8");
      parsed = JSON.parse(data);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }

    // Public endpoint: return only the urgent update (no auth needed)
    if (publicOnly) {
      return NextResponse.json({ urgentUpdate: parsed.urgentUpdate || "" });
    }

    // Admin endpoint: return everything
    const cookieStore = await cookies();
    const token = cookieStore.get("neurotoned_admin_token")?.value;
    if (token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ sops: parsed.sops || "", urgentUpdate: parsed.urgentUpdate || "" });
  } catch {
    return NextResponse.json({ error: "Failed to read SOPs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("neurotoned_admin_token")?.value;
    if (token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { sops, urgentUpdate } = await req.json();
    await ensureDataPath();
    // Read existing data to merge fields
    let existing: any = { sops: "", urgentUpdate: "" };
    try {
      const raw = await fs.readFile(dataFilePath, "utf8");
      existing = JSON.parse(raw);
    } catch {}
    const updated = {
      sops: sops !== undefined ? sops : existing.sops || "",
      urgentUpdate: urgentUpdate !== undefined ? urgentUpdate : existing.urgentUpdate || "",
    };
    await fs.writeFile(dataFilePath, JSON.stringify(updated), "utf8");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to write SOPs" }, { status: 500 });
  }
}
