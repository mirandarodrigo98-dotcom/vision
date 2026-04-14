async function test() {
  const rawText = "IMPOSTO A RESTITUIR\r\n1.250,00\r\nSALDO DO IMPOSTO A PAGAR\r\n5.916,86\r\nNÚMERO DE QUOTAS 8\r\nVALOR DA QUOTA\r\n739,60\r\nCÓDIGO DO BANCO 341\r\nAGÊNCIA BANCÁRIA 9339\r\nCONTA PARA DÉBITO 00333-8";
  const text = rawText.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ');
  console.log("Cleaned:", text);
  
  const restitutionMatch = text.match(/IMPOSTO A RESTITUIR.*?([\d]+(?:\.\d{3})*,\d{2})/i);
  console.log("Restitution:", restitutionMatch ? restitutionMatch[1] : 'Not found');
  
  const taxToPayMatch = text.match(/SALDO DO IMPOSTO A PAGAR.*?([\d]+(?:\.\d{3})*,\d{2})/i);
  console.log("Tax to pay:", taxToPayMatch ? taxToPayMatch[1] : 'Not found');

  const quotasMatch = text.match(/NÚMERO DE QUOTAS.*?(\d+)/i);
  console.log("Quotas:", quotasMatch ? quotasMatch[1] : 'Not found');

  const quotaValMatch = text.match(/VALOR DA QUOTA.*?([\d]+(?:\.\d{3})*,\d{2})/i);
  console.log("Valor da Quota:", quotaValMatch ? quotaValMatch[1] : 'Not found');

  const bankCodeMatch = text.match(/CÓDIGO DO BANCO.*?(\d+)/i);
  console.log("Banco:", bankCodeMatch ? bankCodeMatch[1] : 'Not found');

  const agencyMatch = text.match(/AGÊNCIA BANCÁRIA.*?([\w\d-]+)/i);
  console.log("Agencia:", agencyMatch ? agencyMatch[1] : 'Not found');

  const accountMatch = text.match(/CONTA PARA DÉBITO.*?([\w\d-]+)/i);
  console.log("Conta:", accountMatch ? accountMatch[1] : 'Not found');
}
test();