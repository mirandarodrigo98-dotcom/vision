'use server';

import axios from 'axios';
import { getOmieConfig } from './omie-config';

// Retorna as contas a receber do Omie
export async function listarContasReceber(dataEmissaoDe: string, dataEmissaoAte: string) {
  const config = await getOmieConfig();

  if (!config || !config.is_active || !config.app_key || !config.app_secret) {
    throw new Error('Credenciais da API Omie não configuradas ou inativas. Acesse Integrações > Omie para configurar.');
  }

  const appKey = config.app_key;
  const appSecret = config.app_secret;

  try {
    const payload = {
      call: "ListarContasReceber",
      app_key: appKey,
      app_secret: appSecret,
      param: [
        {
          pagina: 1,
          registros_por_pagina: 500, // Ajuste caso o volume de dados seja maior
          apenas_importado_api: "N",
          filtrar_por_data_emissao_de: dataEmissaoDe, // Formato DD/MM/YYYY
          filtrar_por_data_emissao_ate: dataEmissaoAte
        }
      ]
    };

    const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data.conta_receber_cadastro || [];
  } catch (error: any) {
    console.error('Erro na integração Omie:', error.response?.data || error.message);
    throw new Error('Falha ao buscar as contas a receber no Omie. Verifique o período e as credenciais.');
  }
}
