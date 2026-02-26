import db from '../lib/db';
import fetch from 'node-fetch';

async function generateAndSend() {
  console.log("=== Gerando Arquivo Posicional para Questor ===");

  try {
    const config = await db.prepare("SELECT * FROM questor_syn_config LIMIT 1").get();
    const routine = await db.prepare("SELECT * FROM questor_syn_routines WHERE system_code = 'CONTABIL_IMPORT'").get();
    const company = await db.prepare("SELECT * FROM client_companies LIMIT 1").get();

    if (!config || !routine || !company) {
      console.error("❌ Configuração, Rotina ou Empresa ausente.");
      return;
    }

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

    // Helper para Padding
    const pad = (str: string, length: number, char: string = ' ', align: 'left' | 'right' = 'left') => {
      const s = String(str).substring(0, length);
      if (align === 'left') return s.padEnd(length, char);
      return s.padStart(length, char);
    };

    // Buffer de 445 bytes preenchido com espaços
    const buffer = Buffer.alloc(445, ' '); // 445 bytes (ASCII)

    // Função para escrever no buffer (Posição base 1 -> index base 0)
    const write = (pos: number, len: number, value: string, align: 'left' | 'right' = 'left', padChar: string = ' ') => {
      const start = pos - 1;
      const formatted = pad(value, len, padChar, align);
      buffer.write(formatted, start, len, 'latin1'); // Questor usa ANSI/Latin1 geralmente
    };

    // Mapeamento de Dados
    const date = new Date(transaction.date);
    const dateStr = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`; // DDMMAAAA
    
    const value = parseFloat(transaction.value);
    const absValue = Math.abs(value);
    const valueStr = absValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

    let description = transaction.category_name === transaction.description ? transaction.category_name : `${transaction.category_name} ${transaction.description}`.trim();
    description = description.replace(/;/g, ' ').replace(/(\r\n|\n|\r)/gm, ' ').substring(0, 300);

    // Preenchimento Posicional
    // CODIGOEMPRESA: Pos 2, Tam 5
    write(2, 5, company.code || '', 'right', '0');

    // CODIGOESTAB: Pos 23, Tam 5
    write(23, 5, company.filial || '1', 'right', '0');

    // DATALCTOCTB: Pos 35, Tam 8
    write(35, 8, dateStr, 'right', '0'); // DDMMAAAA

    // TIPOLANCAMENTO: Pos 45, Tam 2
    write(45, 2, 'LN', 'left');

    // CONTACTBDEB: Pos 59, Tam 11
    write(59, 11, debit, 'right', ' '); // Espaços à esquerda para alinhar à direita

    // CONTACTBCRED: Pos 70, Tam 11
    write(70, 11, credit, 'right', ' ');

    // CODIGOHISTCTB: Pos 81, Tam 6
    write(81, 6, '1', 'right', '0'); // Histórico 1 (Padrão)

    // COMPLHIST: Pos 87, Tam 300
    write(87, 300, description, 'left', ' ');

    // VALORLCTOCTB: Pos 387, Tam 16
    write(387, 16, valueStr, 'right', ' ');

    // ORIGEMDADO: Pos 430, Tam 2
    write(430, 2, '3', 'left', ' '); // '3 '

    const line = buffer.toString('latin1');
    console.log("📏 Tamanho da Linha:", line.length);
    console.log("📄 Linha Gerada (Preview):", line);

    // Envio
    const layoutName = routine.action_name.toLowerCase().endsWith('.nli') 
        ? routine.action_name 
        : `${routine.action_name}.nli`;

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

    let url = `${config.base_url}/Integracao/Importar`;
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
    console.error("❌ Erro:", error);
  }
}

generateAndSend();
