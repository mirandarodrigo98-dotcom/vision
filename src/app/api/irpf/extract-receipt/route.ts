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

    const text = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1 as any);
      pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        let lines: Array<{ y: number, items: Array<{ x: number, text: string }> }> = [];
        
        if (pdfData && pdfData.Pages) {
            pdfData.Pages.forEach((page: any) => {
                if (page.Texts) {
                    page.Texts.forEach((t: any) => {
                        const textStr = decodeURIComponent(t.R[0].T);
                        const y = Math.round(t.y * 2) / 2; // tolerance of 0.5
                        const x = t.x;
                        
                        let line = lines.find(l => l.y === y);
                        if (!line) {
                            line = { y, items: [] };
                            lines.push(line);
                        }
                        line.items.push({ x, textStr });
                    });
                }
            });
        }

        lines.sort((a, b) => a.y - b.y);
        lines.forEach(l => l.items.sort((a, b) => a.x - b.x));

        const fullText = lines.map(l => l.items.map(i => i.textStr).join(' ')).join('\n');
        resolve(fullText);
      });
      pdfParser.parseBuffer(buffer);
    });

    // We have the raw text. Let's extract.
    // Replace multiple spaces/newlines with single spaces to make regex easier
    const cleanText = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').toUpperCase();

    const normalizeMoney = (raw: string): string => {
      const cleaned = raw.trim().replace(/\s+/g, '').replace(/[^\d.,]/g, '');
      if (!cleaned) return '';

      let numeric = '';
      if (cleaned.includes(',')) {
        // Formato BR: 1.234,56 / 1234,56
        numeric = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // Fallback: 1234.56 ou 1.234.56
        const lastDot = cleaned.lastIndexOf('.');
        if (lastDot !== -1 && cleaned.length - lastDot - 1 === 2) {
          const integerPart = cleaned.slice(0, lastDot).replace(/\./g, '');
          const fractionalPart = cleaned.slice(lastDot + 1);
          numeric = `${integerPart}.${fractionalPart}`;
        } else {
          numeric = cleaned.replace(/\./g, '');
        }
      }

      const value = Number.parseFloat(numeric);
      if (!Number.isFinite(value)) return '';

      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const collectMoneyValues = (regexes: RegExp[]) => {
      const values: string[] = [];
      for (const regex of regexes) {
        for (const match of cleanText.matchAll(regex)) {
          const normalized = normalizeMoney(match[1] || '');
          if (normalized) values.push(normalized);
        }
      }
      return Array.from(new Set(values));
    };

    const pickPreferredMoney = (values: string[]) => {
      if (values.length === 0) return '';
      const nonZero = values.find(v => v !== '0,00');
      return nonZero || values[0];
    };

    let restitutionValue = '';
    let taxToPayValue = '';
    let quotasCount = '';
    let quotaValue = '';
    let bankInfo = '';

    // Coleta todos os valores candidatos e prioriza o primeiro não-zero.
    const restitutionCandidates = collectMoneyValues([
      /IMPOSTO A RESTITUIR.{0,250}?([\d.\s]+[.,]\d{2})/g,
      /VALOR DA RESTITUI[CÇ][AÃ]O.{0,250}?([\d.\s]+[.,]\d{2})/g,
      /RESTITUIR.{0,250}?([\d.\s]+[.,]\d{2})/g,
    ]);
    restitutionValue = pickPreferredMoney(restitutionCandidates);

    const taxToPayCandidates = collectMoneyValues([
      /TOTAL DO IMPOSTO A PAGAR.{0,250}?([\d.\s]+[.,]\d{2})/g,
      /SALDO DO IMPOSTO A PAGAR.{0,250}?([\d.\s]+[.,]\d{2})/g,
      /IMPOSTO A PAGAR.{0,250}?([\d.\s]+[.,]\d{2})/g,
    ]);
    taxToPayValue = pickPreferredMoney(taxToPayCandidates);

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
