function test() {
  const data = [
    { DESCRICAO: 'Matriz - Revenda', FEV2025_ALIQUOTA: '10.1142' },
    { DESCRICAO: 'Matriz - Revenda Com Sub', FEV2025_ALIQUOTA: '6.7260' },
  ];
  
  const monthData = {};
  const monthPrefixes = new Set(['FEV2025']);
  const monthsMap = { FEV: '02' };
  
  monthData['2025-02'] = { _aliquotas: [], rpa_cash: 0 };
  
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

  const headerKeys = Object.keys(data[0]);

  for (const row of data) {
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
                     if (!monthDataEntry._aliquotas) monthDataEntry._aliquotas = [];
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

  console.log(monthData);
}

test();