const xml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:open="http://www.openuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <open:enviarDados>
         <open:emitente>
            <open:CnpjEmitente>49932356000152</open:CnpjEmitente>
            <open:Email>contato@nzdcontabilidade.com.br</open:Email>
         </open:emitente>
         <open:documentos>
            <open:Documento>
               <open:DataPagamento>15/04/2026</open:DataPagamento>
               <open:SqDocumento>1</open:SqDocumento>
               <open:TipoDocumento>1</open:TipoDocumento>
               <open:TipoPagamento>1</open:TipoPagamento>
               <open:ItensPagamentos>
                  <open:ItemPagamento>
                     <open:TipoId>1</open:TipoId>
                     <open:CepContribuinte>27211160</open:CepContribuinte>
                     <open:Cnpj>49932356000152</open:Cnpj>
                     <open:CodigoProduto>698</open:CodigoProduto>
                     <open:DataFatoGerador>01/04/2026</open:DataFatoGerador>
                     <open:DataVencimento>15/04/2026</open:DataVencimento>
                     <open:DddContribuinte>24</open:DddContribuinte>
                     <open:DiaVencimento>15</open:DiaVencimento>
                     <open:EnderecoContribuinte>RUA TESTE</open:EnderecoContribuinte>
                     <open:InformacoesComplementares>TESTE</open:InformacoesComplementares>
                     <open:InscEstadualRJ>99199237</open:InscEstadualRJ>
                     <open:MunicipioContribuinte>VOLTA REDONDA</open:MunicipioContribuinte>
                     <open:UfContribuinte>RJ</open:UfContribuinte>
                     <open:Natureza>4</open:Natureza>
                     <open:NomeRazaoSocial>TESTE LTDA</open:NomeRazaoSocial>
                     <open:NotaFiscalCnpj>49932356000152</open:NotaFiscalCnpj>
                     <open:NotaFiscalDataEmissao>01/04/2026</open:NotaFiscalDataEmissao>
                     <open:NotaFiscalNumero>1</open:NotaFiscalNumero>
                     <open:NotaFiscalSerie>1</open:NotaFiscalSerie>
                     <open:NotaFiscalTipo>NFe</open:NotaFiscalTipo>
                     <open:NumControleContribuinte>125</open:NumControleContribuinte>
                     <open:PeriodoReferenciaAno>2026</open:PeriodoReferenciaAno>
                     <open:PeriodoReferenciaMes>4</open:PeriodoReferenciaMes>
                     <open:TelefoneContribuinte>30265648</open:TelefoneContribuinte>
                     <open:TipoApuracao>1</open:TipoApuracao>
                     <open:TipoPeriodoApuracao>M</open:TipoPeriodoApuracao>
                     <open:ValorFECPPrincipal>100</open:ValorFECPPrincipal>
                     <open:ValorICMSPrincipal>1000</open:ValorICMSPrincipal>
                     <open:ValorTotal>1100</open:ValorTotal>
                  </open:ItemPagamento>
               </open:ItensPagamentos>
            </open:Documento>
         </open:documentos>
      </open:enviarDados>
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