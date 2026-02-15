import db from '@/lib/db';

function mapResult(raw: any) {
  const logradouro = raw?.logradouro || raw?.street || '';
  const complemento = raw?.complemento || raw?.complement || '';
  const bairro = raw?.bairro || raw?.neighborhood || '';
  const localidade = raw?.localidade || raw?.city || raw?.municipio || '';
  const uf = raw?.uf || raw?.state || '';
  const tipo = logradouro ? String(logradouro).split(' ')[0] : '';
  const nome = logradouro ? String(logradouro).split(' ').slice(1).join(' ') : '';
  return {
    logradouro,
    complemento,
    bairro,
    localidade,
    uf,
    tipo,
    nome,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const cep = (url.searchParams.get('cep') || '').replace(/\D/g, '');
    if (!cep || cep.length !== 8) {
      return new Response(JSON.stringify({ error: 'CEP inválido' }), { status: 400 });
    }

    const baseSetting = await db.prepare("SELECT value FROM settings WHERE key = 'CORREIOS_CEP_BASE_URL'").get() as { value?: string } | undefined;
    const tokenSetting = await db.prepare("SELECT value FROM settings WHERE key = 'CORREIOS_CEP_TOKEN'").get() as { value?: string } | undefined;

    const baseUrl = baseSetting?.value?.trim();
    const token = tokenSetting?.value?.trim();

    let data: any = null;

    if (baseUrl && token) {
      const res = await fetch(`${baseUrl}${cep}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Falha na consulta Correios' }), { status: res.status });
      }
      const json = await res.json();
      data = Array.isArray(json) ? json[0] : json;
    } else {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Falha na consulta ViaCEP' }), { status: res.status });
      }
      data = await res.json();
      if (data?.erro) {
        return new Response(JSON.stringify({ error: 'CEP não encontrado' }), { status: 404 });
      }
    }

    const mapped = mapResult(data || {});
    return new Response(JSON.stringify(mapped), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Erro interno' }), { status: 500 });
  }
}
