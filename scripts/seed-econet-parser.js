const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
      const val = match[2].replace(/"/g, '').trim();
      process.env[match[1]] = val;
  }
});

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const txtPath = path.join(process.cwd(), 'public', 'Novo Site Econet.txt');
        if (!fs.existsSync(txtPath)) {
            console.error('Arquivo TXT não encontrado. Execute o extrator primeiro.');
            return;
        }

        const text = fs.readFileSync(txtPath, 'utf-8');
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        let currentItem = null;
        let currentItemName = null;
        let currentMvaOriginal = null;
        let currentFundamento = null;
        let currentAmbito = null;
        
        let count = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Identificar Cabeçalho do Item (ex: "7. PEÇAS, PARTES E ACESSÓRIOS...")
            const itemMatch = line.match(/^(\d+)\.\s*(.*)/);
            if (itemMatch && line === line.toUpperCase()) { // Heurística pra achar cabeçalho
                currentItem = parseInt(itemMatch[1]);
                currentItemName = itemMatch[2].trim();
                continue;
            }

            // Identificar MVA Original (heurística básica, procurando o percentual da MVA Original)
            const mvaMatch = line.match(/(\d+,\d+)%/g);
            if (mvaMatch && mvaMatch.length >= 1 && (lines[i-1] && lines[i-1].includes('MVA Original') || lines[i-2] && lines[i-2].includes('MVA Original') || line.includes('Demais casos'))) {
                currentMvaOriginal = parseFloat(mvaMatch[0].replace(',', '.'));
            }

            // Identificar Fundamento Normativo
            if (line.toLowerCase().startsWith('fundamento normativo:')) {
                currentFundamento = line.replace(/fundamento normativo:/i, '').trim();
                continue;
            }

            // Identificar Âmbito de Aplicação
            if (line.toLowerCase().startsWith('âmbito de aplicação:')) {
                let ambito = line.replace(/âmbito de aplicação:/i, '').trim();
                let j = i + 1;
                while (j < lines.length && !lines[j].match(/^(\d+\.\d+)\s+(\d{2}\.\d{3}\.\d{2})/) && !lines[j].toLowerCase().startsWith('a base de cálculo') && !lines[j].toLowerCase().startsWith('nota econet')) {
                     ambito += ' ' + lines[j];
                     j++;
                }
                currentAmbito = ambito.substring(0, 1000);
                continue;
            }

            // Identificar Linha de Tabela (Subitem, CEST, NCM, Descrição)
            // Formato: 7.4   01.004.00  3923.30.00  Reservatórios de óleo
            // Formato alternativo: 1.1 03.003.00 2201.10.00 Água mineral
            const rowMatch = line.match(/^(\d+\.\d+)\s+(\d{2}\.\d{3}\.\d{2})\s+([\d\.]+)\s+(.*)/);
            const rowMatchAlt = line.match(/^(\d+\.\d+)\s+(\d{2}\.\d{3}\.\d{2})\s+(.*)/);

            let subitem, cest, ncm, descricao;
            
            if (rowMatch) {
                subitem = rowMatch[1];
                cest = rowMatch[2];
                ncm = rowMatch[3];
                descricao = rowMatch[4];
            } else if (rowMatchAlt) {
                subitem = rowMatchAlt[1];
                cest = rowMatchAlt[2];
                // Como NCM pode estar na próxima linha, a gente procura
                let nextLineNcmMatch = lines[i+1]?.match(/^([\d\.]+)\s+(.*)/) || lines[i+1]?.match(/^([\d\.]+)/);
                if (nextLineNcmMatch && nextLineNcmMatch[1].replace(/\./g, '').length >= 4) {
                    ncm = nextLineNcmMatch[1];
                    descricao = rowMatchAlt[3] + ' ' + (nextLineNcmMatch[2] || '');
                    i++; // avança uma linha
                } else {
                    ncm = null;
                    descricao = rowMatchAlt[3];
                }
            }

            if (subitem && cest) {
                // Tratar descrição quebrando linha
                let j = i + 1;
                let foundMvaInline = false;
                while (j < lines.length && !lines[j].match(/^\d+\.\d+\s+\d{2}\.\d{3}\.\d{2}/) && !lines[j].match(/^\d+\./) && !lines[j].startsWith('Subitem')) {
                    if (lines[j].length > 0 && !lines[j].includes('Novo Site Econet') && !lines[j].includes('Page (')) {
                        // Verifica se nessa quebra de linha achamos os percentuais de MVA pro item específico
                        const itemMvaMatch = lines[j].match(/(\d+,\d+)%\s+(\d+,\d+)%/);
                        if (itemMvaMatch) {
                            currentMvaOriginal = parseFloat(itemMvaMatch[1].replace(',', '.'));
                            foundMvaInline = true;
                        } else {
                            descricao += ' ' + lines[j];
                        }
                    }
                    j++;
                }

                // Inserir no banco
                await pool.query(`
                    INSERT INTO fiscal_regras_st 
                    (uf, item, nome_item, subitem, cest, ncm_sh, descricao, mva_original, fundamento_normativo, ambito_aplicacao, notas)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    'RJ', 
                    currentItem || parseInt(subitem.split('.')[0]), 
                    currentItemName,
                    subitem, 
                    cest, 
                    ncm, 
                    descricao.substring(0, 150), // Limitar tamanho
                    currentMvaOriginal || 0, 
                    currentFundamento || '',
                    currentAmbito || '',
                    'Importado via Parser Automatizado PDF Econet'
                ]);
                count++;
            }
        }
        
        console.log(`${count} regras do Estado do RJ extraídas dinamicamente do PDF Econet e inseridas no banco.`);
    } catch (e) {
        console.error('Erro:', e);
    } finally {
        await pool.end();
    }
}
main();
