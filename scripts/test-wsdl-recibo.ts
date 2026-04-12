import axios from 'axios';
async function main() {
  try {
    const res = await axios.get('https://app.omie.com.br/api/v1/servicos/recibo/?WSDL');
    console.log(res.data);
  } catch (e) {
    console.error(e);
  }
}
main();