import db from '../lib/db';
import fetch from 'node-fetch';

async function generateAndSendCSV() {
  console.log("=== Gerando CSV Completo para Questor ===");

  try {
    const config = await db.prepare("SELECT * FROM questor_syn_config LIMIT 1").get();
    const routine = await db.prepare("SELECT * FROM questor_syn_routines WHERE system_code = 'CONTABIL_IMPORT'").get();
    const company = await db.prepare("SELECT * FROM client_companies LIMIT 1").get();

    if (!config || !routine || !company) return;

    const transaction = await db.prepare(`
      SELECT t.*, 
             c.description as category_name, c.code as category_code, c.integration_code as category_integration_code, 
             a.description as account_name, a.code as account_code, a.integration_code as account_integration_code
      FROM enuves_transactions t
      LEFT JOIN enuves_categories c ON t.category_id = c.id
      LEFT JOIN enuves_accounts a ON t.account_id = a.id
      LIMIT 1
    `).get();

    if (!transaction) return;

    // Dados
    const date = new Date(transaction.date);
    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const value = parseFloat(transaction.value);
    const absValue = Math.abs(value);
    const valueStr = absValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const categoryCode = transaction.category_integration_code || transaction.category_code || '';
    const accountCode = transaction.account_integration_code || transaction.account_code || '';
    
    let debit = '';
    let credit = '';
    if (value > 0) { debit = accountCode; credit = categoryCode; } 
    else { debit = categoryCode; credit = accountCode; }

    let description = transaction.category_name === transaction.description ? transaction.category_name : `${transaction.category_name} ${transaction.description}`.trim();
    description = description.replace(/;/g, ' ').replace(/(\r\n|\n|\r)/gm, ' ').substring(0, 300);

    // Montar CSV com TODAS as colunas na ordem do Layout
    const cols = [
      company.code || '',        // 1. EMPRESA
      '',                        // 2. CHAVELCTOCTB
      '',                        // 3. CODIGOLCTOPROG
      company.filial || '1',     // 4. ESTAB
      '',                        // 5. CODIGOLOTECTB
      dateStr,                   // 6. DATA
      'LN',                      // 7. TIPOLANCAMENTO
      '',                        // 8. NUMERODCTO
      '',                        // 9. CODIGOORIGLCTOCTB
      debit,                     // 10. DEBITO
      credit,                    // 11. CREDITO
      '1',                       // 12. CODIGOHISTCTB
      description,               // 13. COMPLHIST
      valueStr,                  // 14. VALOR
      '',                        // 15. LCTOCONCILDEB
      '',                        // 16. LCTOCONCILCRED
      '',                        // 17. CODIGOUSUARIO
      '',                        // 18. DATAHORA
      '',                        // 19. CHAVEORIGEM
      '3',                       // 20. ORIGEMDADO
      '',                        // 21. TRANSCTB
      ''                         // 22. ESTABORI
    ];

    const line = cols.join(';');
    console.log("📄 Linha CSV:", line);

    // Envio
    const layoutName = routine.action_name.toLowerCase().endsWith('.nli') 
        ? routine.action_name 
        : `${routine.action_name}.nli`;

    const layoutBase64 = Buffer.from(routine.layout_content).toString('base64');
    const dadosBase64 = Buffer.from(line).toString('base64');

    const payload = {
        Leiautes: [{ Nome: layoutName, Arquivo: layoutBase64 }],
        Dados: dadosBase64,
        PodeAlterarDados: true,
        ExecutarValidacaoFinal: "Sim"
    };

    let url = `${config.base_url}/Integracao/Importar`;
    if (config.api_token) url += `?TokenApi=${encodeURIComponent(config.api_token)}`;

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
    console.error("❌ Erro:", error);
  }
}

generateAndSendCSV();
