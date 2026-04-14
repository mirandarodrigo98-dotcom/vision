'use server';

import db from '@/lib/db';

export async function gerarDarjSt(params: {
   empresaId: string;
   dataPagamento: string; // YYYY-MM-DD
   dataVencimento: string; // YYYY-MM-DD
   natureza: string;
   produto: string;
   tipoApuracao: number; // 1 = Por período, 2 = Por operação
   tipoPeriodo: string; // M, Q, D
   informacoesComplementares: string;
   totalIcmsStPuro: number;
   totalFecpSt: number;
   totalGeral: number;
   periodoMes: number;
   periodoAno: number;
}) {
   try {
      // 1. Obter dados do Emitente (NZD Contabilidade)
      const { rows: nzdRows } = await db.query("SELECT cnpj, email_contato FROM client_companies WHERE nome ILIKE '%NZD CONTABILIDADE%' LIMIT 1");
      if (nzdRows.length === 0) {
         return { success: false, error: 'Emitente NZD Contabilidade não encontrado no sistema.' };
      }
      const emitenteCnpj = nzdRows[0].cnpj.replace(/\D/g, '');
      const emitenteEmail = nzdRows[0].email_contato || 'contato@nzdcontabilidade.com.br';

      // 2. Obter dados da Empresa Destinatária
      const { rows: empresaRows } = await db.query("SELECT * FROM client_companies WHERE id = $1", [params.empresaId]);
      if (empresaRows.length === 0) {
         return { success: false, error: 'Empresa destinatária não encontrada.' };
      }
      const emp = empresaRows[0];
      const cnpjDest = (emp.cnpj || '').replace(/\D/g, '');
      const cep = (emp.address_zip_code || '00000000').replace(/\D/g, '');
      const endereco = \`\${emp.address_street || ''} \${emp.address_number || ''} \${emp.address_complement || ''}\`.trim().substring(0, 70);
      const municipio = (emp.municipio || 'Rio de Janeiro').substring(0, 30);
      const uf = (emp.uf || 'RJ').substring(0, 2);
      const telefoneStr = (emp.telefone || '0000000000').replace(/\D/g, '');
      const ddd = telefoneStr.length >= 10 ? telefoneStr.substring(0, 2) : '21';
      const telefone = telefoneStr.length >= 10 ? telefoneStr.substring(2) : '00000000';
      const razaoSocial = (emp.razao_social || emp.nome || '').substring(0, 70);
      // Inscrição Estadual (fallback para 99199237 conforme manual se não informada)
      // Se tivermos a IE no banco futuramente, pegar de lá. Por enquanto hardcode.
      const ie = '99199237'; 
      
      const dataPagtoFormatada = params.dataPagamento.split('-').reverse().join('/'); // DD/MM/YYYY
      const dataVencFormatada = params.dataVencimento.split('-').reverse().join('/'); // DD/MM/YYYY
      const diaVencimento = params.dataVencimento.split('-')[2];

      const valorFecp = Math.round(params.totalFecpSt * 100);
      const valorIcms = Math.round(params.totalIcmsStPuro * 100);
      const valorTotal = Math.round(params.totalGeral * 100);
      
      const infoComplXML = params.informacoesComplementares 
         ? \`<open:InformacoesComplementares>\${params.informacoesComplementares.substring(0, 255)}</open:InformacoesComplementares>\` 
         : '';

      // Natureza 4 = Substituição Tributária por Operação/Outros
      // CodigoProduto 698 = Outros
      const xmlChamada = \`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:open="http://www.openuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <open:enviarDados>
         <open:emitente>
            <open:CnpjEmitente>\${emitenteCnpj}</open:CnpjEmitente>
            <open:Email>\${emitenteEmail}</open:Email>
         </open:emitente>
         <open:documentos>
            <open:Documento>
               <open:DataPagamento>\${dataPagtoFormatada}</open:DataPagamento>
               <open:SqDocumento>1</open:SqDocumento>
               <open:TipoDocumento>1</open:TipoDocumento>
               <open:TipoPagamento>1</open:TipoPagamento>
               <open:ItensPagamentos>
                  <open:ItemPagamento>
                     <open:TipoId>1</open:TipoId>
                     <open:CepContribuinte>\${cep}</open:CepContribuinte>
                     <open:Cnpj>\${cnpjDest}</open:Cnpj>
                     <open:CodigoProduto>\${params.produto}</open:CodigoProduto>
                     <open:DataVencimento>\${dataVencFormatada}</open:DataVencimento>
                     <open:DddContribuinte>\${ddd}</open:DddContribuinte>
                     <open:DiaVencimento>\${diaVencimento}</open:DiaVencimento>
                     <open:EnderecoContribuinte>\${endereco}</open:EnderecoContribuinte>
                     \${infoComplXML}
                     <open:InscEstadualRJ>\${ie}</open:InscEstadualRJ>
                     <open:MunicipioContribuinte>\${municipio}</open:MunicipioContribuinte>
                     <open:UfContribuinte>\${uf}</open:UfContribuinte>
                     <open:Natureza>\${params.natureza}</open:Natureza>
                     <open:NomeRazaoSocial>\${razaoSocial}</open:NomeRazaoSocial>
                     <open:NumControleContribuinte>DARJST\${Date.now()}</open:NumControleContribuinte>
                     <open:PeriodoReferenciaAno>\${params.periodoAno}</open:PeriodoReferenciaAno>
                     <open:PeriodoReferenciaMes>\${params.periodoMes}</open:PeriodoReferenciaMes>
                     <open:TelefoneContribuinte>\${telefone}</open:TelefoneContribuinte>
                     <open:TipoApuracao>\${params.tipoApuracao}</open:TipoApuracao>
                     <open:TipoPeriodoApuracao>\${params.tipoPeriodo}</open:TipoPeriodoApuracao>
                     <open:ValorFECPPrincipal>\${valorFecp}</open:ValorFECPPrincipal>
                     <open:ValorICMSPrincipal>\${valorIcms}</open:ValorICMSPrincipal>
                     <open:ValorTotal>\${valorTotal}</open:ValorTotal>
                  </open:ItemPagamento>
               </open:ItensPagamentos>
            </open:Documento>
         </open:documentos>
      </open:enviarDados>
   </soapenv:Body>
</soapenv:Envelope>\`;

      const WSDL_URL = 'https://www1.fazenda.rj.gov.br/portaldepagamentos/br/gov/rj/sef/gct/webservice/GerarDocumentoArrecadacaoWS.jws';

      const resChamada = await fetch(WSDL_URL, {
         method: 'POST',
         headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': '""'
         },
         body: xmlChamada
      });

      const textChamada = await resChamada.text();
      
      const idSessaoMatch = textChamada.match(/<m:IdSessao>(\d+)<\/m:IdSessao>/);
      const msgMatch = textChamada.match(/<m:MensagemRetorno>(.*?)<\/m:MensagemRetorno>/);

      if (!idSessaoMatch) {
         return { success: false, error: 'Falha ao enviar lote. Retorno: ' + (msgMatch ? msgMatch[1] : textChamada.substring(0, 200)) };
      }

      const idSessao = idSessaoMatch[1];

      // Aguardar alguns segundos antes de consultar
      await new Promise(resolve => setTimeout(resolve, 3000));

      const xmlConsulta = \`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:open="http://www.openuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <open:consultarDados>
         <open:cnpj>\${emitenteCnpj}</open:cnpj>
         <open:idSessao>\${idSessao}</open:idSessao>
      </open:consultarDados>
   </soapenv:Body>
</soapenv:Envelope>\`;

      // Consultar até 3 vezes se estiver em processamento
      for (let i = 0; i < 3; i++) {
         const resConsulta = await fetch(WSDL_URL, {
            method: 'POST',
            headers: {
               'Content-Type': 'text/xml;charset=UTF-8',
               'SOAPAction': '""'
            },
            body: xmlConsulta
         });

         const textConsulta = await resConsulta.text();
         
         const statusMatch = textConsulta.match(/<m:Status>(.*?)<\/m:Status>/);
         if (statusMatch && statusMatch[1] === 'Processado') {
            const codigoBarraMatch = textConsulta.match(/<m:ListaCodigoBarra>(.*?)<\/m:ListaCodigoBarra>/);
            const nossoNumeroMatch = textConsulta.match(/<m:NossoNumeroSEFAZ>(.*?)<\/m:NossoNumeroSEFAZ>/);
            const pixMatch = textConsulta.match(/<m:PixCopiaCola>(.*?)<\/m:PixCopiaCola>/);
            const falhaMatch = textConsulta.match(/<m:DescricaoErro>(.*?)<\/m:DescricaoErro>/);
            
            // Valores calculados pela SEFAZ
            const icmsMora = textConsulta.match(/<m:ValorICMSMora>(.*?)<\/m:ValorICMSMora>/);
            const icmsMulta = textConsulta.match(/<m:ValorICMSMultaMora>(.*?)<\/m:ValorICMSMultaMora>/);
            const icmsAtualizado = textConsulta.match(/<m:ValorICMSAtualizado>(.*?)<\/m:ValorICMSAtualizado>/);
            const fecpMora = textConsulta.match(/<m:ValorFECPMora>(.*?)<\/m:ValorFECPMora>/);
            const fecpMulta = textConsulta.match(/<m:ValorFECPMultaMora>(.*?)<\/m:ValorFECPMultaMora>/);
            const fecpAtualizado = textConsulta.match(/<m:ValorFECPAtualizado>(.*?)<\/m:ValorFECPAtualizado>/);
            const valorTotalGuia = textConsulta.match(/<m:ValorTotal>(.*?)<\/m:ValorTotal>/);

            if (codigoBarraMatch) {
               return {
                  success: true,
                  data: {
                     codigoBarra: codigoBarraMatch[1],
                     nossoNumero: nossoNumeroMatch ? nossoNumeroMatch[1] : '',
                     pixCopiaCola: (pixMatch && pixMatch[1] !== 'xsi:nil="true"') ? pixMatch[1] : '',
                     idSessao,
                     valores: {
                        icmsMora: icmsMora ? (parseInt(icmsMora[1])/100) : 0,
                        icmsMulta: icmsMulta ? (parseInt(icmsMulta[1])/100) : 0,
                        icmsAtualizado: icmsAtualizado ? (parseInt(icmsAtualizado[1])/100) : 0,
                        fecpMora: fecpMora ? (parseInt(fecpMora[1])/100) : 0,
                        fecpMulta: fecpMulta ? (parseInt(fecpMulta[1])/100) : 0,
                        fecpAtualizado: fecpAtualizado ? (parseInt(fecpAtualizado[1])/100) : 0,
                        totalGuia: valorTotalGuia ? (parseInt(valorTotalGuia[1])/100) : 0
                     }
                  }
               };
            } else if (falhaMatch) {
               return { success: false, error: 'Erro no processamento da SEFAZ: ' + falhaMatch[1] };
            }
         }
         
         // Espera mais 3 segundos antes da próxima tentativa
         await new Promise(resolve => setTimeout(resolve, 3000));
      }

      return { success: false, error: 'O DARJ está em processamento na SEFAZ. Tente consultar novamente mais tarde.' };

   } catch (error: any) {
      console.error("Erro ao gerar DARJ:", error);
      return { success: false, error: 'Erro interno ao conectar com a SEFAZ RJ.' };
   }
}