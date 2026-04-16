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

    const pdfParser = new PDFParser(null, 1); // 1 = text mode

    const text = await new Promise<string>((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        resolve(pdfParser.getRawTextContent());
      });
      pdfParser.parseBuffer(buffer);
    });

    // We have the raw text. Let's extract.
    // Replace multiple spaces/newlines with single spaces to make regex easier
    const cleanText = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').toUpperCase();

    let restitutionValue = '';
    let taxToPayValue = '';
    let quotasCount = '';
    let quotaValue = '';
    let bankInfo = '';

    // Regex para pegar valor no formato 1.234,56 ou 123,45
    // O PDF da RFB geralmente traz os labels abaixo.
    
    // Tentar encontrar Imposto a Restituir
    const matchRest = cleanText.match(/IMPOSTO A RESTITUIR[^\d]*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (matchRest) {
      restitutionValue = matchRest[1];
    } else {
        const matchRest2 = cleanText.match(/VALOR DA RESTITUI[CÇ][AÃ]O[^\d]*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
        if (matchRest2) restitutionValue = matchRest2[1];
    }

    // Tentar encontrar Imposto a Pagar
    const matchPagar = cleanText.match(/TOTAL DO IMPOSTO A PAGAR[^\d]*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (matchPagar) {
      taxToPayValue = matchPagar[1];
    } else {
        const matchPagar2 = cleanText.match(/IMPOSTO A PAGAR[^\d]*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
        if (matchPagar2) taxToPayValue = matchPagar2[1];
    }

    // Se tiver imposto a pagar, tentar pegar cotas
    if (taxToPayValue && taxToPayValue !== '0,00') {
      const matchQuotas = cleanText.match(/N[UÚ]MERO DE QUOTAS[^\d]*?(\d+)/) || cleanText.match(/QUOTAS.*?(\d+)/);
      if (matchQuotas) quotasCount = matchQuotas[1];

      const matchQuotaVal = cleanText.match(/VALOR DA QUOTA[^\d]*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
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
