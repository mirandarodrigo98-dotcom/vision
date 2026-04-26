import Papa from 'papaparse';

async function test() {
  const data = `
"Fiscal";"26/04/2026 15:50 Pág:0001"

"Relação dos últimos meses de salário e encargos da Folha de Pagamento"
"Análise SuperSimples - Período: 01/2026 à 12/2026 "

"Empresa: 65 CORACOES CENTRO MEDICO INTEGRADO LTDA Fil: 1 Matriz  Iníc.Ativ: 22/03/1995"

"Competência";;;;;;"Total"
"______________________________________________________________________________________________________________________________"
01/2026;;;;;;10.000,00;
02/2026;;;;;;20.000,00;
03/2026;;;;;;30.538,72;
04/2026;;;;;;0,00;
"______________________________________________________________________________________________________________________________"
"";;;;;0,00
  `;
  
  const parsed = Papa.parse(data.trim(), { skipEmptyLines: true, delimiter: ';' });
  const rows = parsed.data as string[][];
  let isDataSection = false;
  const analiseData: Record<string, number> = {};
  
  for (const row of rows) {
      if (row.length > 0 && row[0].includes('Competência')) {
          isDataSection = true;
          continue;
      }
      
      if (isDataSection && row.length > 0) {
          const comp = row[0].trim().replace(/"/g, '');
          if (comp.startsWith('_') || comp === '' || comp.length < 7) continue;
          
          const nonEmptyValues = row.filter(v => v.trim() !== '');
          const totalStr = nonEmptyValues.length > 1 ? nonEmptyValues[nonEmptyValues.length - 1] : '0';
          let total = 0;
          if (totalStr) {
              const cleanTotalStr = totalStr.replace(/"/g, '').trim();
              total = parseFloat(cleanTotalStr.replace(/\./g, '').replace(',', '.')) || 0;
          }
          
          const [month, year] = comp.split('/');
          if (month && year && year.length === 4) {
              const formattedComp = `${year}-${month.padStart(2, '0')}`;
              analiseData[formattedComp] = total;
          }
      }
  }
  
  console.log(analiseData);
  process.exit(0);
}

test();
