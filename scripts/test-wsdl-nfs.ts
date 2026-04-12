import axios from 'axios';
async function main() {
  try {
    const res = await axios.get('https://app.omie.com.br/api/v1/servicos/nfse/?WSDL');
    const xml = res.data;
    const start = xml.indexOf('<s:complexType name="nfseListarRequest">');
    const end = xml.indexOf('</s:complexType>', start);
    console.log(xml.substring(start, end));
  } catch (e) {
    console.error(e);
  }
}
main();