'use server';

import axios from 'axios';
import { getUserPermissions } from '../permissions';

// Interfaces base para GNRE
export interface GnreData {
  ufFavorecida: string;
  receita: string;
  documentoOrigem?: string;
  dataVencimento: string;
  dataPagamento?: string;
  valor: number;
  contribuinte: {
    cnpj: string;
    razaoSocial: string;
    ie?: string;
    endereco?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
    telefone?: string;
  };
}

export interface GnreLoteResponse {
  success: boolean;
  message: string;
  numeroRecibo?: string;
  protocolo?: string;
  xmlRequisicao?: string;
  xmlResposta?: string;
}

/**
 * Função para enviar o Lote GNRE.
 * Como o ambiente da SEFAZ-PE exige certificado digital (e-CNPJ) e o ambiente Vercel requer configuração 
 * específica (via variáveis de ambiente ou secrets), esta action constrói o XML completo 
 * e faz a chamada SOAP. O modo "mock" é habilitado se não houver certificado configurado.
 */
export async function enviarLoteGnre(guias: GnreData[]): Promise<GnreLoteResponse> {
  try {
    const permissions = await getUserPermissions();
    if (!permissions.includes('fiscal.view')) {
      return { success: false, message: 'Permissão negada para emissão de GNRE.' };
    }

    if (!guias || guias.length === 0) {
      return { success: false, message: 'Nenhuma guia informada para envio.' };
    }

    // Construção do XML do Lote (Padrão GNRE v2.00)
    let guiasXml = '';
    guias.forEach((guia, index) => {
      guiasXml += `
        <TGuia_GNRE>
          <c01_UfFavorecida>${guia.ufFavorecida}</c01_UfFavorecida>
          <c02_receita>${guia.receita}</c02_receita>
          <c25_documentoOrigem>${guia.documentoOrigem || ''}</c25_documentoOrigem>
          <c27_tipoIdentificacaoEmitente>1</c27_tipoIdentificacaoEmitente>
          <c03_idContribuinteEmitente>
            <CNPJ>${guia.contribuinte.cnpj.replace(/\D/g, '')}</CNPJ>
          </c03_idContribuinteEmitente>
          <c16_razaoSocialEmitente>${guia.contribuinte.razaoSocial}</c16_razaoSocialEmitente>
          <c14_dataVencimento>${guia.dataVencimento}</c14_dataVencimento>
          <c33_dataPagamento>${guia.dataPagamento || guia.dataVencimento}</c33_dataPagamento>
          <c06_valorPrincipal>${guia.valor.toFixed(2)}</c06_valorPrincipal>
        </TGuia_GNRE>
      `;
    });

    const xmlLote = `<?xml version="1.0" encoding="UTF-8"?>
<TLote_GNRE xmlns="http://www.gnre.pe.gov.br" versao="2.00">
  <guias>
    ${guiasXml}
  </guias>
</TLote_GNRE>`;

    const soapRequisicao = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gnre="http://www.gnre.pe.gov.br/webservice/GnreLoteRecepcao">
   <soapenv:Header>
      <gnre:gnreCabecMsg>
         <gnre:versaoDados>2.00</gnre:versaoDados>
      </gnre:gnreCabecMsg>
   </soapenv:Header>
   <soapenv:Body>
      <gnre:gnreDadosMsg>
         ${xmlLote}
      </gnre:gnreDadosMsg>
   </soapenv:Body>
</soapenv:Envelope>`;

    // Verifica se estamos em modo de homologação/mock (quando não há certificado de prod configurado)
    const isMockMode = !process.env.GNRE_CERT_BASE64;

    if (isMockMode) {
      console.log('Modo de Simulação GNRE ativado. Gerando recibo simulado.');
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 1500));

      const fakeRecibo = Math.floor(Math.random() * 10000000000).toString();
      
      return {
        success: true,
        message: 'Lote recebido com sucesso (Ambiente de Testes/Simulação).',
        numeroRecibo: fakeRecibo,
        protocolo: `PROT-${fakeRecibo}`,
        xmlRequisicao: xmlLote,
        xmlResposta: `<TRetLote_GNRE><ambiente>2</ambiente><recibo><numero>${fakeRecibo}</numero></recibo></TRetLote_GNRE>`
      };
    }

    // Implementação real (necessita do certificado HTTPS)
    const https = require('https');
    const agent = new https.Agent({
      pfx: Buffer.from(process.env.GNRE_CERT_BASE64 || '', 'base64'),
      passphrase: process.env.GNRE_CERT_PASSWORD || '',
      rejectUnauthorized: false
    });

    const response = await axios.post(
      'https://www.gnre.pe.gov.br/gnreWS/services/GnreLoteRecepcao',
      soapRequisicao,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'http://www.gnre.pe.gov.br/webservice/GnreLoteRecepcao/processar'
        },
        httpsAgent: agent
      }
    );

    // Parse simples do retorno SOAP
    const responseXml = response.data;
    const matchRecibo = responseXml.match(/<numero>(.*?)<\/numero>/);
    const numeroRecibo = matchRecibo ? matchRecibo[1] : null;

    if (numeroRecibo) {
      return {
        success: true,
        message: 'Lote recebido com sucesso.',
        numeroRecibo,
        xmlRequisicao: xmlLote,
        xmlResposta: responseXml
      };
    } else {
      return {
        success: false,
        message: 'Erro ao processar o lote no SEFAZ.',
        xmlRequisicao: xmlLote,
        xmlResposta: responseXml
      };
    }

  } catch (error: any) {
    console.error('Erro na integração GNRE:', error);
    return {
      success: false,
      message: 'Falha de comunicação com o WebService GNRE.',
      xmlResposta: error.response?.data || error.message
    };
  }
}

/**
 * Consulta o processamento do Lote pelo número do recibo
 */
export async function consultarLoteGnre(numeroRecibo: string): Promise<any> {
  try {
    const isMockMode = !process.env.GNRE_CERT_BASE64;
    
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'Consulta realizada com sucesso (Simulação).',
        situacaoLote: 'PROCESSADO_COM_SUCESSO',
        guiasProcessadas: [
          {
            linhaDigitavel: '85800000000 0 12345678901 2 12345678901 3 12345678901 4',
            codigoBarras: '858000000000123456789012123456789013123456789014',
            status: 'Sucesso'
          }
        ]
      };
    }

    const xmlConsulta = `<?xml version="1.0" encoding="UTF-8"?>
<TConsulta_GNRE xmlns="http://www.gnre.pe.gov.br" versao="2.00">
  <ambiente>1</ambiente>
  <tipoConsulta>1</tipoConsulta>
  <recibo>${numeroRecibo}</recibo>
</TConsulta_GNRE>`;

    const soapRequisicao = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gnre="http://www.gnre.pe.gov.br/webservice/GnreResultadoLote">
   <soapenv:Header>
      <gnre:gnreCabecMsg>
         <gnre:versaoDados>2.00</gnre:versaoDados>
      </gnre:gnreCabecMsg>
   </soapenv:Header>
   <soapenv:Body>
      <gnre:gnreDadosMsg>
         ${xmlConsulta}
      </gnre:gnreDadosMsg>
   </soapenv:Body>
</soapenv:Envelope>`;

    const https = require('https');
    const agent = new https.Agent({
      pfx: Buffer.from(process.env.GNRE_CERT_BASE64 || '', 'base64'),
      passphrase: process.env.GNRE_CERT_PASSWORD || '',
      rejectUnauthorized: false
    });

    const response = await axios.post(
      'https://www.gnre.pe.gov.br/gnreWS/services/GnreResultadoLote',
      soapRequisicao,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'http://www.gnre.pe.gov.br/webservice/GnreResultadoLote/consultar'
        },
        httpsAgent: agent
      }
    );

    return {
      success: true,
      message: 'Consulta realizada com sucesso.',
      xmlResposta: response.data
    };

  } catch (error: any) {
    console.error('Erro na consulta GNRE:', error);
    return {
      success: false,
      message: 'Falha de comunicação com o WebService GNRE (Consulta).',
      xmlResposta: error.response?.data || error.message
    };
  }
}
