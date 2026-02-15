import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true });
}

export async function POST(_req: NextRequest) {
  return NextResponse.json({ ok: true });
}
