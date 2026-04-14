import { NextResponse } from 'next/server';
import { obterBoletoOmie, downloadBoletoPdfServer } from '@/app/actions/integrations/omie';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id param required' });

  const boletoData = await obterBoletoOmie(Number(id));
  if (boletoData.error) return NextResponse.json(boletoData);

  const url = boletoData.data?.cLinkBoleto;
  if (!url) return NextResponse.json({ error: 'no cLinkBoleto' });

  try {
    const fetchResponse = await fetch(url);
    const contentType = fetchResponse.headers.get('content-type');
    const text = await fetchResponse.text();
    
    return new NextResponse(JSON.stringify({
      url,
      contentType,
      preview: text.substring(0, 500)
    }), { headers: { 'Content-Type': 'application/json' }});
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}