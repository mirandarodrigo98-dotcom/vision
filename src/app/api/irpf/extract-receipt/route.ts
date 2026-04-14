import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);
    const text = data.text;

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
    const restitutionMatch = text.match(/IMPOSTO A RESTITUIR.*?([\d]+(?:\.\d{3})*,\d{2})/i);
    if (restitutionMatch && restitutionMatch[1]) {
      result.restitutionValue = restitutionMatch[1].trim();
    }

    // Parse "SALDO DO IMPOSTO A PAGAR"
    // Usually it looks like: "SALDO DO IMPOSTO A PAGAR 5.916,86"
    const taxToPayMatch = text.match(/SALDO DO IMPOSTO A PAGAR.*?([\d]+(?:\.\d{3})*,\d{2})/i);
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
