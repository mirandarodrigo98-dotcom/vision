import { NextResponse } from 'next/server';
// Usando pdf2json que é compatível com Node puro e não exige DOMMatrix/canvas
const PDFParser = require('pdf2json');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Usando Promise para encapsular a API baseada em eventos do pdf2json
    const rawText = await new Promise<string>((resolve, reject) => {
      // O segundo parâmetro '1' indica que queremos extrair apenas texto raw (menos processamento)
      const pdfParser = new PDFParser(null, 1);

      pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
      pdfParser.on('pdfParser_dataReady', () => {
        // No modo text-only, o texto fica disponível usando getRawTextContent()
        resolve(pdfParser.getRawTextContent());
      });

      pdfParser.parseBuffer(buffer);
    });

    // Limpar quebras de linha, tabulações e excesso de espaços para garantir que as expressões regulares (Regex)
    // consigam ler os valores mesmo que o pdf2json tenha quebrado o valor para a linha de baixo
    const text = rawText.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ');

    // Default return
    const result = {
      restitutionValue: '',
      taxToPayValue: '',
      quotasCount: '',
      quotaValue: '',
      bankInfo: ''
    };

    // Parse "IMPOSTO A RESTITUIR"
    // Usually it looks like: "IMPOSTO A RESTITUIR 1.250,00"
    const restitutionMatch = text.match(/IMPOSTO A RESTITUIR.{0,50}?([\d]+(?:\.\d{3})*,\d{2})/i);
    if (restitutionMatch && restitutionMatch[1]) {
      result.restitutionValue = restitutionMatch[1].trim();
    }

    // Parse "SALDO DO IMPOSTO A PAGAR"
    // Usually it looks like: "SALDO DO IMPOSTO A PAGAR 5.916,86"
    const taxToPayMatch = text.match(/SALDO DO IMPOSTO A PAGAR.{0,50}?([\d]+(?:\.\d{3})*,\d{2})/i);
    if (taxToPayMatch && taxToPayMatch[1]) {
      result.taxToPayValue = taxToPayMatch[1].trim();
    }

    // NÚMERO DE QUOTAS
    const quotasMatch = text.match(/NÚMERO DE QUOTAS.*?(\d+)/i);
    if (quotasMatch && quotasMatch[1]) {
      result.quotasCount = quotasMatch[1].trim();
    }

    // VALOR DA QUOTA
    const quotaValMatch = text.match(/VALOR DA QUOTA.*?([\d]+(?:\.\d{3})*,\d{2})/i);
    if (quotaValMatch && quotaValMatch[1]) {
      result.quotaValue = quotaValMatch[1].trim();
    }

    // CÓDIGO DO BANCO
    const bankCodeMatch = text.match(/CÓDIGO DO BANCO.*?(\d+)/i);
    let bankCode = bankCodeMatch ? bankCodeMatch[1].trim() : '';

    // AGÊNCIA BANCÁRIA
    const agencyMatch = text.match(/AGÊNCIA BANCÁRIA.*?([\w\d-]+)/i);
    let agency = agencyMatch ? agencyMatch[1].trim() : '';

    // CONTA PARA DÉBITO
    const accountMatch = text.match(/CONTA PARA DÉBITO.*?([\w\d-]+)/i);
    let account = accountMatch ? accountMatch[1].trim() : '';

    if (bankCode || agency || account) {
      result.bankInfo = `Banco: ${bankCode}, Ag: ${agency}, Conta: ${account}`;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
