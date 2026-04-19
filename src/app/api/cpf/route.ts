import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cpf = searchParams.get('cpf');

  if (!cpf) {
    return NextResponse.json({ error: 'CPF não informado' }, { status: 400 });
  }

  try {
    const cleanCpf = cpf.replace(/\D/g, '');
    // Tenta buscar nos sócios (Pessoa Física) que já existem no sistema
    const socio = (await db.query(`SELECT nome FROM societario_socios WHERE cpf = $1`, [cleanCpf])).rows[0];
    
    if (socio && socio.nome) {
      return NextResponse.json({ nome: socio.nome });
    }

    // Se não encontrou, tenta buscar nos usuários (caso seja um usuário com CPF cadastrado)
    const user = (await db.query(`SELECT name as nome FROM users WHERE cpf = $1`, [cleanCpf])).rows[0];
    
    if (user && user.nome) {
      return NextResponse.json({ nome: user.nome });
    }
    
    // Fallback: Se futuramente houver integração com API da Receita Federal, pode ser chamada aqui.
    return NextResponse.json({ error: 'CPF não encontrado na base de dados interna' }, { status: 404 });

  } catch (error) {
    console.error('Error fetching CPF:', error);
    return NextResponse.json({ error: 'Erro ao buscar CPF' }, { status: 500 });
  }
}
