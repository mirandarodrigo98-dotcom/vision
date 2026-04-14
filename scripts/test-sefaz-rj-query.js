const xml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:open="http://www.openuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <open:consultarDados>
         <open:cnpj>49932356000152</open:cnpj>
         <open:idSessao>79018716</open:idSessao>
      </open:consultarDados>
   </soapenv:Body>
</soapenv:Envelope>`;

fetch('https://www1.fazenda.rj.gov.br/portaldepagamentos/br/gov/rj/sef/gct/webservice/GerarDocumentoArrecadacaoWS.jws', {
    method: 'POST',
    headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': '""'
    },
    body: xml
})
.then(res => res.text())
.then(text => console.log(text))
.catch(err => console.error(err));