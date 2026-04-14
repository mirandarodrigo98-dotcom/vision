const text = "SALDO DO IMPOSTO A PAGAR 0,00 OUTRO VALOR 1.234,56";
const match = text.match(/SALDO DO IMPOSTO A PAGAR.*?([\d]+(?:\.\d{3})*,\d{2})/i);
console.log(match[1]);