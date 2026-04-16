const texts = [
  "IMPOSTO A RESTITUIR 1.250,00",
  "IMPOSTO A RESTITUIR 1250,00",
  "IMPOSTO A RESTITUIR 1 250,00",
  "VALOR DA RESTITUIÇÃO 12.345,67",
  "RESTITUIR EM 15/04/2026: 1.250,00",
  "IMPOSTO A RESTITUIR (92) 0,00",
  "IMPOSTO A RESTITUIR \n\n 1.250,00",
  "IMPOSTO A RESTITUIR 1.250,00 SALDO DO IMPOSTO A PAGAR 0,00"
];

// Current regex in code
const regexCurrent = /IMPOSTO A RESTITUIR.{0,100}?(\d{1,3}(?:\.\d{3})*,\d{2})/;
const regexRestituir2 = /VALOR DA RESTITUI[CÇ][AÃ]O.{0,100}?(\d{1,3}(?:\.\d{3})*,\d{2})/;
const matchRest3 = /RESTITUIR.{0,100}?(\d{1,3}(?:\.\d{3})*,\d{2})/;

console.log("--- CURRENT REGEX ---");
for (const text of texts) {
  const clean = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').toUpperCase();
  let val = null;
  const m1 = clean.match(regexCurrent);
  if (m1) val = m1[1];
  else {
    const m2 = clean.match(regexRestituir2);
    if (m2) val = m2[1];
    else {
      const m3 = clean.match(matchRest3);
      if (m3) val = m3[1];
    }
  }
  console.log(`"${clean}" -> ${val}`);
}

// Proposed regex
// Permite pontos ou espaços como separador de milhar, ou sem separador
const regexProposed1 = /IMPOSTO A RESTITUIR.{0,100}?([\d\.\s]+,\d{2})/;
const regexProposed2 = /VALOR DA RESTITUI[CÇ][AÃ]O.{0,100}?([\d\.\s]+,\d{2})/;
const regexProposed3 = /RESTITUIR.{0,100}?([\d\.\s]+,\d{2})/;

console.log("\n--- PROPOSED REGEX ---");
for (const text of texts) {
  const clean = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').toUpperCase();
  let val = null;
  const m1 = clean.match(regexProposed1);
  if (m1) val = m1[1];
  else {
    const m2 = clean.match(regexProposed2);
    if (m2) val = m2[1];
    else {
      const m3 = clean.match(regexProposed3);
      if (m3) val = m3[1];
    }
  }
  if (val) val = val.trim().replace(/\s+/g, '');
  console.log(`"${clean}" -> ${val}`);
}
