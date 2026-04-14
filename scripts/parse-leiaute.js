const xlsx = require('xlsx');

const workbook = xlsx.readFile('leiaute_darj.xls');
const sheetNameList = workbook.SheetNames;
sheetNameList.forEach(y => {
    const worksheet = workbook.Sheets[y];
    const data = xlsx.utils.sheet_to_json(worksheet, {header: 1});
    console.log("Sheet:", y);
    console.log(JSON.stringify(data.slice(0, 15), null, 2));
});