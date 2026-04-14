import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const configRes = await db.query('SELECT * FROM omie_config WHERE id = 1');
    const config = configRes.rows[0];
    
    const payload = { 
      call: 'ListarContasReceber', 
      app_key: config.app_key, 
      app_secret: config.app_secret, 
      param: [{ 
        pagina: 1,
        registros_por_pagina: 100
      }] 
    };
    
    const response = await fetch('https://app.omie.com.br/api/v1/financas/contareceber/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    const contas = data.conta_receber_cadastro || [];
    
    const contaComBoleto = contas.find((c: any) => c.cLinkBoleto);
    
    if (contaComBoleto) {
      const link = contaComBoleto.cLinkBoleto;
      
      const htmlRes = await fetch(link, {
          headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
      });
      const contentType = htmlRes.headers.get('content-type');
      
      if (contentType && contentType.includes('text/html')) {
         const html = await htmlRes.text();
         const pdfMatches = html.match(/https?:\/\/[^"']+\.pdf/g);
         const iframeMatches = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
         
         return NextResponse.json({
           link,
           contentType,
           isHtml: true,
           pdfMatches,
           iframeMatches,
           htmlSample: html.substring(0, 1000)
         });
      } else {
         return NextResponse.json({
           link,
           contentType,
           isHtml: false
         });
      }
    }
    
    return NextResponse.json({ error: 'Nenhum boleto encontrado' });
  } catch(e: any) {
    return NextResponse.json({ error: e.message });
  }
}