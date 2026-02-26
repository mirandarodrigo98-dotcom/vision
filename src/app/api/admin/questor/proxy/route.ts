import { NextRequest, NextResponse } from 'next/server';
import { getQuestorSynConfig } from '@/app/actions/integrations/questor-syn';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  const config = await getQuestorSynConfig();
  if (!config || !config.base_url) {
    return NextResponse.json({ error: 'Questor nWeb not configured' }, { status: 500 });
  }

  const url = `${config.base_url}${path.startsWith('/') ? '' : '/'}${path}`;
  
  try {
    const headers: HeadersInit = {};
    if (config.api_token) {
        // According to docs, token might be query param TokenApi or header. 
        // Docs say: "No campo abaixo, você pode inserir o Token... e clicar para salvar no cabeçalho da rotina"
        // And "Ao salvar o token, em todos os demais endpoints será obrigatório o uso do parâmetro TokenApi".
        // Let's assume query param based on "TokenApi (Não obrigatório)" in lists.
        // But if user sets it in header in Questor, it expects header.
        // Let's pass as query param if present in our config, appending to url.
        // But for safety, let's try to handle it in the URL construction if not already there.
    }

    // Append TokenApi if exists
    let finalUrl = url;
    if (config.api_token) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl += `${separator}TokenApi=${encodeURIComponent(config.api_token)}`;
    }

    const response = await fetch(finalUrl);
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } else {
        const text = await response.text();
        return NextResponse.json({ text }, { status: response.status });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
