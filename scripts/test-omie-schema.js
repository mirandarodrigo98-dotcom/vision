const axios = require('axios');
const xml2js = require('xml2js');

async function main() {
    try {
        const res = await axios.get('https://app.omie.com.br/api/v1/financas/contareceberboleto/?WSDL');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(res.data);
        
        const types = result['wsdl:definitions']['wsdl:types'][0]['s:schema'][0]['s:complexType'];
        const req = types.find(t => t['$'].name === 'boletoCancelarRequest');
        console.log(req['s:sequence'][0]['s:element'].map(e => e['$'].name));
    } catch(e) {
        console.log(e.message);
    }
}
main();