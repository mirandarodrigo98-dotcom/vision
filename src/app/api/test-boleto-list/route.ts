import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const res = await db.query("SELECT codigo_lancamento FROM omie_recebimentos LIMIT 10");
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}