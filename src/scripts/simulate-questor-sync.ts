import db from '../lib/db';
import fetch from 'node-fetch';

async function simulateSync() {
  console.log("=== Simulando Sincronização com Questor ===");

  try {
    // 1. Configurações
    const config = (await db.query("SELECT * FROM questor_syn_config LIMIT 1", [])).rows[0];
    const routine = (await db.query("SELECT * FROM questor_syn_routines WHERE system_code = 'CONTABIL_IMPORT'", [])).rows[0];

    if (!config || !routine) {
      console.error("❌ Configuração ou Rotina ausente.");
      return;
    }

    // 2. Pegar uma transação de exemplo
    const transaction = (await db.query(`
      SELECT t.*, 
             c.description as category_name, c.code as category_code, c.integration_code as category_integration_code, 
             a.description as account_name, a.code as account_code, a.integration_code as account_integration_code
      FROM enuves_transactions t
      LEFT JOIN enuves_categories c ON t.category_id = c.id
      LEFT JOIN enuves_accounts a ON t.account_id = a.id
      LIMIT 1
    `, [])).rows[0];

    if (!transaction) {
      console.error("❌ Nenhuma transação encontrada para teste.");
      return;
    }

    console.log("📝 Transação selecionada:", transaction.description, "| Valor:", transaction.value);

    // 3. Montar Payload (cópia da lógica do app)
    const date = new Date(transaction.date);
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const value = parseFloat(transaction.value);
    const absValue = Math.abs(value);
    const formattedValue = absValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const categoryCode = transaction.category_integration_code || transaction.category_code || '';
    const accountCode = transaction.account_integration_code || transaction.account_code || '';

    let debit = '';
    let credit = '';

    if (value > 0) {
      debit = accountCode;
      credit = categoryCode;
    } else {
      debit = categoryCode;
      credit = accountCode;
    }

    const historicoCode = '1'; 
    let description = transaction.category_name === transaction.description ? transaction.category_name : `${transaction.category_name} ${transaction.description}`.trim();
    description = description.replace(/;/g, ' ').replace(/(\r\n|\n|\r)/gm, ' ').substring(0, 200);

    const line = `${formattedDate};${debit};${credit};${historicoCode};${description};${formattedValue}`;
    console.log("📄 Linha Gerada:", line);

    const layoutName = routine.action_name.toLowerCase().endsWith('.nli') 
        ? routine.action_name 
        : `${routine.action_name}.nli`;

    // Conversão para Base64 correta
    const layoutBase64 = Buffer.from(routine.layout_content).toString('base64');
    const dadosBase64 = Buffer.from(line).toString('base64');

    const payload = {
        Leiautes: [
            {
                Nome: layoutName, 
                Arquivo: layoutBase64
            }
        ],
        Dados: dadosBase64,
        PodeAlterarDados: true,
        ExecutarValidacaoFinal: "Sim"
    };

    // 4. Enviar
    let baseUrl = config.base_url;
    if (!baseUrl && config.internal_url) baseUrl = config.internal_url;
    if (!baseUrl && config.external_url) baseUrl = config.external_url;

    if (!baseUrl) {
        console.error("❌ Nenhuma URL configurada.");
        return;
    }

    let url = `${baseUrl}/Integracao/Importar`;
    if (config.api_token) {
        url += `?TokenApi=${encodeURIComponent(config.api_token)}`;
    }

    console.log(`🚀 Enviando para: ${url.replace(config.api_token, '******')}`);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    console.log(`📡 Status HTTP: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📦 Corpo da Resposta:`);
    console.log(responseText);

  } catch (error) {
    console.error("❌ Erro no teste:", error);
  }
}

simulateSync();
