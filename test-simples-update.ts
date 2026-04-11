import db from './src/lib/db';
import { executeQuestorProcess } from './src/app/actions/integrations/questor-syn';

async function test() {
  const questorParams = {
    pCodigoEmpresa: '20',
    pFilial: '1',
    pCompetInicial: '01/01/2024',
    pCompetFinal: '01/12/2024',
    pDetalhar: '0',
    pOcultar: '1',
  };
  
  const result = await executeQuestorProcess('TnFisDPGerarSSimplesFederal', questorParams);
  
  const dataObj = result.data;
  let foundData = [];
  if (dataObj.FormClass && dataObj.Widgets) {
        const bottom = dataObj.Widgets?.bottom || [];
        for (const b of bottom) {
            if (b.Itens) {
                for (const item of b.Itens) {
                    if (item.grids) {
                        for (const grid of item.grids) {
                            const gridItems = grid.items || grid.dados;
                            if (gridItems && Array.isArray(gridItems) && gridItems.length > 0) {
                                const isHistory = (grid.Caption && grid.Caption.includes('12 Meses')) || (grid.nomegrid && grid.nomegrid.includes('Anteriores'));
                                if (!isHistory) {
                                    foundData = gridItems;
                                    break;
                                } else if (foundData.length === 0) {
                                    foundData = gridItems;
                                }
                            }
                        }
                    }
                    if (foundData.length > 0) break;
                }
            }
            if (foundData.length > 0) break;
        }
  } else if (Array.isArray(dataObj)) {
      foundData = dataObj;
  }

  const rows = foundData;
  console.log('Total rows:', rows.length);

  const monthData = {};
  const monthsMap = {
        'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
        'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
        'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
  };

  const parseValue = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      if (typeof val !== 'string') return 0;
      
      const v = val.toString().replace(/[^\d,.-]/g, '').trim();
      if (v === '') return 0;

      const lastComma = v.lastIndexOf(',');
      const lastDot = v.lastIndexOf('.');
      
      if (lastComma > lastDot) {
           const clean = v.replace(/\./g, '').replace(',', '.');
           return parseFloat(clean) || 0;
      } else if (lastDot > -1) {
          const clean = v.replace(/,/g, '');
          return parseFloat(clean) || 0;
      } else {
          return parseFloat(v) || 0;
      }
  };

  const headerKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
  const monthPrefixes = new Set();
  headerKeys.forEach(k => {
      const m = k.match(/^([A-Z]{3}\d{4})(_|$)/);
      if (m) monthPrefixes.add(m[1]);
  });

  for (const mPrefix of monthPrefixes) {
      const mStr = mPrefix.substring(0,3);
      const yStr = mPrefix.substring(3);
      if (!monthsMap[mStr]) continue;
      const competence = `${yStr}-${monthsMap[mStr]}`;
      if (!monthData[competence]) {
          monthData[competence] = { competence, rpa_cash: 0, _aliquotas: [] };
      }
  }

  for (const row of rows) {
      for (const mPrefix of monthPrefixes) {
          const mStr = mPrefix.substring(0,3);
          const yStr = mPrefix.substring(3);
          if (!monthsMap[mStr]) continue;
          const competence = `${yStr}-${monthsMap[mStr]}`;
          
          if (monthData[competence]) {
               let aliqStr = row[`${mPrefix}_ALIQUOTA`] || row[`${mPrefix}_ALIQ`];
               
               if (!aliqStr) {
                   const aliqKey = headerKeys.find(k => k.startsWith(mPrefix) && (k.toUpperCase().includes('ALIQUOTA') || k.toUpperCase().includes('ALIQ')));
                   if (aliqKey) aliqStr = row[aliqKey];
               }

               if (aliqStr) {
                   const aliqVal = parseValue(aliqStr);
                   if (aliqVal > 0) {
                       const monthDataEntry = monthData[competence];
                       if (!monthDataEntry._aliquotas.includes(aliqVal)) {
                           monthDataEntry._aliquotas.push(aliqVal);
                       }
                   }
               }
          }
      }
  }

  Object.values(monthData).forEach(d => {
      if (d._aliquotas && d._aliquotas.length > 0) {
          const sum = d._aliquotas.reduce((a, b) => a + b, 0);
          d.rpa_cash = sum / d._aliquotas.length;
      }
      delete d._aliquotas;
  });

  console.log('Final data:', monthData);

  const companyId = '36ba042a-85a1-4214-9ced-fafba7277617';
  
  for (const competence of Object.keys(monthData)) {
      const rpa_cash = monthData[competence].rpa_cash;
      await db.query(`
          UPDATE simples_nacional_billing
          SET rpa_cash = $1
          WHERE company_id = $2 AND competence = $3
      `, [rpa_cash, companyId, competence]);
  }
  
  console.log("Updated DB");
  process.exit(0);
}

test();