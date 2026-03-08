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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("neurotoned_admin_token")?.value;
    if (token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await ensureDataPath();
    const data = await fs.readFile(dataFilePath, "utf8");
    return NextResponse.json(JSON.parse(data));
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return NextResponse.json({ sops: "" });
    }
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
    const { sops } = await req.json();
    await ensureDataPath();
    await fs.writeFile(dataFilePath, JSON.stringify({ sops }), "utf8");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to write SOPs" }, { status: 500 });
  }
}
