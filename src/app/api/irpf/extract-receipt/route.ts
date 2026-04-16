import { NextRequest, NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const pdfParser = new PDFParser(); // Usando JSON mode para ter as coordenadas (x,y)

    const pdfData = await new Promise<any>((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
      pdfParser.on('pdfParser_dataReady', (data: any) => {
        resolve(data);
      });
      pdfParser.parseBuffer(buffer);
    });

    // Reconstruindo o texto linha por linha baseado na coordenada Y
    // Isso evita que o pdf2json leia colunas fora de ordem
    let lines: { y: number, items: { x: number, text: string }[] }[] = [];
    
    if (pdfData.Pages) {
        pdfData.Pages.forEach((page: any) => {
            if (page.Texts) {
                page.Texts.forEach((t: any) => {
                    const text = decodeURIComponent(t.R[0].T);
                    const y = Math.round(t.y * 2) / 2; // tolerância de 0.5 para mesma linha
                    const x = t.x;
                    
                    let line = lines.find(l => l.y === y);
                    if (!line) {
                        line = { y, items: [] };
                        lines.push(line);
                    }
                    line.items.push({ x, text });
                });
            }
        });
    }

    lines.sort((a, b) => a.y - b.y);
    lines.forEach(l => l.items.sort((a, b) => a.x - b.x));

    const fullText = lines.map(l => l.items.map(i => i.text).join(' ')).join('\n').toUpperCase();
    const cleanText = fullText.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ');

    let restitutionValue = '';
    let taxToPayValue = '';
    let quotasCount = '';
    let quotaValue = '';
    let bankInfo = '';

    // Regex para pegar valor no formato 1.234,56 ou 123,45
    // O PDF da RFB geralmente traz os labels abaixo.
    
    // Tentar encontrar Imposto a Restituir
    // A Receita Federal usa "IMPOSTO A RESTITUIR" nos recibos. O match pega o primeiro número monetário após isso.
    const regexRestituir = /IMPOSTO A RESTITUIR.*?(\d{1,3}(?:\.\d{3})*,\d{2})/;
    const regexRestituir2 = /VALOR DA RESTITUI[CÇ][AÃ]O.*?(\d{1,3}(?:\.\d{3})*,\d{2})/;
    
    const matchRest = cleanText.match(regexRestituir);
    if (matchRest) {
      restitutionValue = matchRest[1];
    } else {
        const matchRest2 = cleanText.match(regexRestituir2);
        if (matchRest2) {
            restitutionValue = matchRest2[1];
        } else {
            // Tentar regex mais flexível caso tenha quebra de página ou formatação estranha do PDF da RFB
            const matchRest3 = cleanText.match(/IMPOSTO A RESTITUIR.*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
            if (matchRest3) restitutionValue = matchRest3[1];
        }
    }

    // Tentar encontrar Imposto a Pagar
    const regexPagar = /TOTAL DO IMPOSTO A PAGAR.*?(\d{1,3}(?:\.\d{3})*,\d{2})/;
    const matchPagar = cleanText.match(regexPagar);
    if (matchPagar) {
      taxToPayValue = matchPagar[1];
    } else {
        const matchPagar2 = cleanText.match(/SALDO DO IMPOSTO A PAGAR.*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
        if (matchPagar2) {
            taxToPayValue = matchPagar2[1];
        } else {
            const matchPagar3 = cleanText.match(/IMPOSTO A PAGAR.*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
            if (matchPagar3) taxToPayValue = matchPagar3[1];
        }
    }

    // Se tiver imposto a pagar, tentar pegar cotas
    if (taxToPayValue && taxToPayValue !== '0,00') {
      const matchQuotas = cleanText.match(/N[UÚ]MERO DE QUOTAS.*?(\d+)/) || cleanText.match(/QUOTAS.*?(\d+)/);
      if (matchQuotas) quotasCount = matchQuotas[1];

      const matchQuotaVal = cleanText.match(/VALOR DA QUOTA.*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
      if (matchQuotaVal) quotaValue = matchQuotaVal[1];

      // Tentar pegar banco se for debito automatico
      const matchBanco = cleanText.match(/BANCO:\s*(\d+).*?AG[EÊ]NCIA:\s*(\S+).*?CONTA:\s*(\S+)/);
      if (matchBanco) {
        bankInfo = `Banco ${matchBanco[1]} Ag ${matchBanco[2]} Cc ${matchBanco[3]}`;
      }
    }

    return NextResponse.json({
      restitutionValue,
      taxToPayValue,
      quotasCount,
      quotaValue,
      bankInfo,
      // text: cleanText // debug if needed
    });
  } catch (error: any) {
    console.error('Erro ao extrair PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
