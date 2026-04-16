const PDFParser = require('pdf2json');

const TARGET_FILE = 'public/12036408702-IRPF-2026-2025-origi-imagem-recibo.pdf';

setTimeout(() => {
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
    pdfParser.on("pdfParser_dataReady", pdfData => {
        let lines = [];
        
        if (pdfData && pdfData.Pages) {
            pdfData.Pages.forEach((page) => {
                if (page.Texts) {
                    page.Texts.forEach((t) => {
                        const rawText = t?.R?.[0]?.T ?? '';
                        let textStr = '';
                        try {
                          textStr = decodeURIComponent(rawText);
                        } catch {
                          textStr = String(rawText);
                        }
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

        const lineTexts = lines.map(l => l.items.map(i => i.textStr).join(' ').trim());
        const cleanLines = lineTexts.map((line) => line.replace(/\s+/g, ' ').toUpperCase());
        const cleanText = lineTexts.join(' ').replace(/\s+/g, ' ').toUpperCase();

        const normalizeMoney = (raw) => {
          const cleaned = raw.trim().replace(/\s+/g, '').replace(/[^\d.,]/g, '');
          if (!cleaned) return '';

          let numeric = '';
          if (cleaned.includes(',')) {
            numeric = cleaned.replace(/\./g, '').replace(',', '.');
          } else {
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
          return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const collectMoneyValues = (regexes) => {
          const values = [];
          for (const regex of regexes) {
            for (const match of cleanText.matchAll(regex)) {
              const normalized = normalizeMoney(match[1] || '');
              if (normalized) values.push(normalized);
            }
          }
          return Array.from(new Set(values));
        };

        const collectByLineProximity = (lineKeywords, lookAhead = 6) => {
          const values = [];
          const moneyRegex = /([\d.\s]+[.,]\d{2})/g;
          for (let i = 0; i < cleanLines.length; i++) {
            const line = cleanLines[i];
            if (!lineKeywords.some((k) => line.includes(k))) continue;
            for (let j = i; j <= Math.min(i + lookAhead, cleanLines.length - 1); j++) {
              const target = cleanLines[j];
              for (const match of target.matchAll(moneyRegex)) {
                const normalized = normalizeMoney(match[1] || '');
                if (normalized) values.push(normalized);
              }
            }
          }
          return Array.from(new Set(values));
        };

        const pickPreferredMoney = (values) => {
          if (!values.length) return '';
          const nonZero = values.find((v) => v !== '0,00');
          return nonZero || values[0];
        };

        const restitutionCandidates = collectMoneyValues([
          /IMPOSTO A RESTITUIR.{0,250}?([\d.\s]+[.,]\d{2})/g,
          /VALOR DA RESTITUI[CÇ][AÃ]O.{0,250}?([\d.\s]+[.,]\d{2})/g,
          /RESTITUIR.{0,250}?([\d.\s]+[.,]\d{2})/g,
        ]);
        const restitutionLineCandidates = collectByLineProximity([
          'IMPOSTO A RESTITUIR',
          'VALOR DA RESTITUI',
          'RESTITUIR',
        ]);

        const restitutionValue = pickPreferredMoney([...restitutionCandidates, ...restitutionLineCandidates]);

        console.log('restitutionCandidates:', restitutionCandidates);
        console.log('restitutionLineCandidates:', restitutionLineCandidates);
        console.log('Extracted Value:', restitutionValue);
        if (!restitutionValue) {
          const interest = cleanLines.filter((l) => l.includes('RESTIT') || l.includes('PAGAR'));
          console.log('interest lines:', interest.slice(0, 40));
        }
    });
    pdfParser.loadPDF(TARGET_FILE);
}, 1000);
