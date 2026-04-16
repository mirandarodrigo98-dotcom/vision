const cleanText = "IMPOSTO A RESTITUIR (VALORES EM REAIS) 1.560,34 SALDO DO IMPOSTO A PAGAR".toUpperCase();

const matchRest3 = cleanText.match(/IMPOSTO A RESTITUIR[^\d]*?(\d{1,3}(?:\.\d{3})*,\d{2})/);
console.log(matchRest3 ? matchRest3[1] : null);