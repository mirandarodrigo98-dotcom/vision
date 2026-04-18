import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  
  const { id } = await params;
  const body = await req.json();

  try {
    await db.query(`
      UPDATE carne_leao_rendimentos 
      SET data_recebimento = $1, natureza = $2, historico = $3, valor = $4, recebido_de = $5
      WHERE id = $6
    `, [body.data_recebimento, body.natureza, body.historico, body.valor, body.recebido_de, id]);
    return NextResponse.json({ success: true });
  } catch (e) {
    return new NextResponse('Error updating', { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  
  const { id } = await params;

  try {
    await db.query(`DELETE FROM carne_leao_rendimentos WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (e) {
    return new NextResponse('Error deleting', { status: 500 });
  }
}