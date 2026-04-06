'use server';

import axios from 'axios';

// Retorna as contas a receber do Omie
export async function listarContasReceber(dataEmissaoDe: string, dataEmissaoAte: string) {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error('Credenciais da API Omie (OMIE_APP_KEY e OMIE_APP_SECRET) não configuradas no ambiente.');
  }

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
