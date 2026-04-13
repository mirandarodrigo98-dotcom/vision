const xlsx = require('xlsx');

const workbook = xlsx.readFile('public/ECONET_VALIDADOR_NFe_C1172659_1776100444471.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log(JSON.stringify(data.slice(5, 20), null, 2));
