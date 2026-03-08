import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    return NextResponse.json({
        url: url ? 'PRESENT' : 'MISSING',
        key: key ? 'PRESENT - starts with ' + key.substring(0, 5) : 'MISSING',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
