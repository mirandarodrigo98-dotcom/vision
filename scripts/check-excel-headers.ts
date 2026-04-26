import * as xlsx from 'xlsx';

const filePath = './public/Contatos_Tratados.xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data: any[] = xlsx.utils.sheet_to_json(worksheet);

if (data.length > 0) {
  console.log('Nomes das colunas encontrados:', Object.keys(data[0]));
  console.log('Primeira linha de exemplo:', data[0]);
} else {
  console.log('A planilha está vazia.');
}
