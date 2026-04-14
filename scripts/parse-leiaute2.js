const xlsx = require('xlsx');

const workbook = xlsx.readFile('leiaute_darj.xls');
const worksheet = workbook.Sheets['Chamada'];
const data = xlsx.utils.sheet_to_json(worksheet, {header: 1});
data.forEach(row => {
    if (row.length > 0) {
        console.log(row[0] + " | " + row[1] + " | " + row[5]);
    }
});