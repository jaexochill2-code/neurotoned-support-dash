import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD || "password";
    if (username.toLowerCase() !== "admin" || password !== adminPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Next 15 requires awaiting cookies
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'neurotoned_admin_token',
      value: 'authenticated',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, 
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Check current auth status (useful for client-side initial load without flashing)
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('neurotoned_admin_token')?.value;
  if (token === 'authenticated') {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
