'use server';

import { getQuestorSynConfig, resolveQuestorUrl } from './questor-syn';

export async function diagnoseQuestorAuth() {
  const config = await getQuestorSynConfig();
  if (!config) {
    return { error: 'Questor não configurado' };
  }

  try {
    const baseUrl = await resolveQuestorUrl(config);
    const token = config.api_token;
    
    // Test 1: Version Endpoint (usually open or basic auth)
    const versionUrl = `${baseUrl}/TnWebDMDadosGerais/PegarVersaoQuestor?TokenApi=${encodeURIComponent(token || '')}`;
    
    console.log('[Diagnostic] Testing URL:', versionUrl.replace(/TokenApi=[^&]+/, 'TokenApi=***'));
    
    const response = await fetch(versionUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      headers[key] = val;
    });

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {
      // ignore
    }

    console.log('[Diagnostic] Response Headers:', headers);
    console.log('[Diagnostic] Response Body:', text);

    // Check for user info in common headers or body
    const userInfo = {
      headers,
      body: json || text,
      status: response.status,
      possibleUser: headers['x-nweb-usuario'] || headers['usuario'] || (json && json.Usuario) || 'Not found in standard fields'
    };

    return { 
      success: true, 
      details: userInfo,
      message: `Status: ${response.status}. Veja os detalhes para informações do usuário.`
    };

  } catch (error: any) {
    console.error('[Diagnostic] Error:', error);
    return { error: error.message };
  }
}
