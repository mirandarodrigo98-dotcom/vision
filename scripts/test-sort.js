const axios = require('axios');

const records = [
    { cabecTitulo: { dDtAlt: '24/05/2025', cHrAlt: '16:03:46' } },
    { cabecTitulo: { dDtAlt: '10/04/2026', cHrAlt: '14:18:00' } },
    { cabecTitulo: { dDtAlt: '15/04/2026', cHrAlt: '10:00:00' } },
];

records.sort((a, b) => {
    const parseDate = (d) => d ? d.split('/').reverse().join('') : '';
    const altA = parseDate(a.cabecTitulo?.dDtAlt);
    const altB = parseDate(b.cabecTitulo?.dDtAlt);
    if (altA !== altB) {
        return altA < altB ? 1 : -1;
    }
    const hrA = a.cabecTitulo?.cHrAlt || '';
    const hrB = b.cabecTitulo?.cHrAlt || '';
    return hrA < hrB ? 1 : -1;
});

console.log(records[0]);