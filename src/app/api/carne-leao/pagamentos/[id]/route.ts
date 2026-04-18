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
      UPDATE carne_leao_pagamentos 
      SET data_pagamento = $1, natureza = $2, historico = $3, valor = $4
      WHERE id = $5
    `, [body.data_pagamento, body.natureza, body.historico, body.valor, id]);
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
    await db.query(`DELETE FROM carne_leao_pagamentos WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (e) {
    return new NextResponse('Error deleting', { status: 500 });
  }
}