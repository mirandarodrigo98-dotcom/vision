const https = require('https');

https.get('https://portal.fazenda.rj.gov.br/pagamentos/emissao-em-lote-darj/', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const regex = /href="(.*?)"/g;
        let m;
        while ((m = regex.exec(data)) !== null) {
            if (m[1].includes('.pdf') || m[1].includes('.xls') || m[1].includes('.doc') || m[1].includes('download')) {
                console.log(m[1]);
            }
        }
    });
}).on('error', err => {
    console.error(err);
});