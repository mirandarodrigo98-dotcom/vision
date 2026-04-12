import axios from 'axios';

async function main() {
  const res = await axios.get('https://app.omie.com.br/api/v1/servicos/os/?WSDL');
  const xml = res.data;
  const start = xml.indexOf('<s:complexType name="osListarRequest">');
  const end = xml.indexOf('</s:complexType>', start);
  console.log(xml.substring(start, end));
}
main();
