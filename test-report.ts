import { executeQuestorReport } from './src/app/actions/integrations/questor-syn';
import Papa from 'papaparse';

async function test() {
  const csv = `
"Fiscal";"26/04/2026 15:26 Pág:0001"

"Relação dos últimos meses de salário e encargos da Folha de Pagamento"
"Análise SuperSimples - Período: 01/2026 à 12/2026 "

"Empresa: 65 CORACOES CENTRO MEDICO INTEGRADO LTDA Fil: 1 Matriz  Iníc.Ativ: 22/03/1995"

"Competência";;;;;;"Total"
"______________________________________________________________________________________________________________________________"
01/2026;;;;;;10,00;
02/2026;;;;;;20,50;
03/2026;;;;;;30,538.72;
04/2026;;;;;;40.538,72;
"______________________________________________________________________________________________________________________________"
"";;;;;
`;

  const parsed = Papa.parse(csv.trim(), { skipEmptyLines: true, delimiter: ';' });
  const rows = parsed.data as string[][];
  
  let isDataSection = false;
  const result: any[] = [];
  
  for (const row of rows) {
    if (row.length > 0 && row[0].includes('Competência')) {
      isDataSection = true;
      continue;
    }
    
    if (isDataSection && row.length > 0) {
      const comp = row[0].trim();
      if (comp.startsWith('"_') || comp === '""' || !comp) continue;
      
      const totalStr = row[row.length - 2]; // Usually the last one is empty if it ends with ';'
      const total = totalStr ? parseFloat(totalStr.replace(/\./g, '').replace(',', '.')) : 0;
      
      result.push({ competence: comp, total });
    }
  }
  
  console.log(result);
  process.exit(0);
}

test();
