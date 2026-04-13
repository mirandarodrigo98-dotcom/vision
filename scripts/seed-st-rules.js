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

const regras = [
  // Cosméticos e Perfumaria (Baseado no Print de Validação - MANNAS PERFUMARIA)
  { uf: 'SP', item: 20, nome_item: 'PRODUTOS DE PERFUMARIA E DE HIGIENE PESSOAL E COSMÉTICOS', subitem: '20.59', cest: '20.059.00', ncm_sh: '9603.30.00', descricao: 'Pincéis e escovas, para cosmética', mva_original: 76.12, mva_ajustada_int12: 0, mva_ajustada_int4: 0, fundamento_normativo: 'Art. 313-E do RICMS/SP' },
  { uf: 'SP', item: 20, nome_item: 'PRODUTOS DE PERFUMARIA E DE HIGIENE PESSOAL E COSMÉTICOS', subitem: '20.61', cest: '20.061.00', ncm_sh: '9615.11.00', descricao: 'Pentes, travessas, para cabelo e artigos semelhantes', mva_original: 76.12, mva_ajustada_int12: 0, mva_ajustada_int4: 0, fundamento_normativo: 'Art. 313-E do RICMS/SP' },
  { uf: 'SP', item: 20, nome_item: 'PRODUTOS DE PERFUMARIA E DE HIGIENE PESSOAL E COSMÉTICOS', subitem: '20.57', cest: '20.057.00', ncm_sh: '9603.29.00', descricao: 'Escovas e pincéis de barba, escovas para cabelos, para cílios ou para unhas', mva_original: 76.12, mva_ajustada_int12: 0, mva_ajustada_int4: 0, fundamento_normativo: 'Art. 313-E do RICMS/SP' },
  
  // Peças e Acessórios para Veículos Automotores (Baseado no Print do PDF)
  { uf: 'RJ', item: 7, nome_item: 'PEÇAS, PARTES E ACESSÓRIOS PARA VEÍCULOS AUTOMOTORES', subitem: '7.1', cest: '01.001.00', ncm_sh: '3815.12.10', descricao: 'Catalisadores em colmeia cerâmica ou metálica', mva_original: 71.78, mva_ajustada_int12: 88.96, mva_ajustada_int4: 106.14, fundamento_normativo: 'Protocolos ICMS 41/08 e 97/10' },
  { uf: 'RJ', item: 7, nome_item: 'PEÇAS, PARTES E ACESSÓRIOS PARA VEÍCULOS AUTOMOTORES', subitem: '7.2', cest: '01.002.00', ncm_sh: '3917.00.00', descricao: 'Tubos e seus acessórios de plásticos', mva_original: 71.78, mva_ajustada_int12: 88.96, mva_ajustada_int4: 106.14, fundamento_normativo: 'Protocolos ICMS 41/08 e 97/10' },
  { uf: 'RJ', item: 7, nome_item: 'PEÇAS, PARTES E ACESSÓRIOS PARA VEÍCULOS AUTOMOTORES', subitem: '7.3', cest: '01.003.00', ncm_sh: '3918.10.00', descricao: 'Protetores de caçamba', mva_original: 71.78, mva_ajustada_int12: 88.96, mva_ajustada_int4: 106.14, fundamento_normativo: 'Protocolos ICMS 41/08 e 97/10' },
  { uf: 'RJ', item: 7, nome_item: 'PEÇAS, PARTES E ACESSÓRIOS PARA VEÍCULOS AUTOMOTORES', subitem: '7.4', cest: '01.004.00', ncm_sh: '3923.30.00', descricao: 'Reservatórios de óleo', mva_original: 71.78, mva_ajustada_int12: 88.96, mva_ajustada_int4: 106.14, fundamento_normativo: 'Protocolos ICMS 41/08 e 97/10' },
  
  // Cervejas, Águas e Bebidas (Baseado no Texto extraído do PDF)
  { uf: 'RJ', item: 1, nome_item: 'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS', subitem: '1.1', cest: '03.003.00', ncm_sh: '2201.10.00', descricao: 'Água mineral, gasosa ou não, ou potável, naturais, em embalagem de vidro descartável 0 a 300ml', mva_original: 140.00, mva_ajustada_int12: 0, mva_ajustada_int4: 0, fundamento_normativo: 'Protocolo ICMS 11/91' },
  { uf: 'RJ', item: 1, nome_item: 'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS', subitem: '1.1', cest: '03.003.00', ncm_sh: '2201.10.00', descricao: 'Água mineral, gasosa ou não, ou potável, naturais, em embalagem de vidro descartável 301 a 500ml', mva_original: 250.00, mva_ajustada_int12: 0, mva_ajustada_int4: 0, fundamento_normativo: 'Protocolo ICMS 11/91' },
  { uf: 'RJ', item: 1, nome_item: 'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS', subitem: '1.3', cest: '03.005.00', ncm_sh: '2201.10.00', descricao: 'Água mineral em copo plástico descartável 0 a 500ml', mva_original: 140.00, mva_ajustada_int12: 0, mva_ajustada_int4: 0, fundamento_normativo: 'Protocolo ICMS 11/91' },
  { uf: 'RJ', item: 1, nome_item: 'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS', subitem: '1.12', cest: '03.010.00', ncm_sh: '2202.10.00', descricao: 'Refrigerante em vidro descartável inferior a 600ml', mva_original: 140.00, mva_ajustada_int12: 0, mva_ajustada_int4: 0, fundamento_normativo: 'Protocolo ICMS 11/91' },
  { uf: 'RJ', item: 1, nome_item: 'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS', subitem: '1.14', cest: '03.010.02', ncm_sh: '2202.10.00', descricao: 'Refrigerante em lata', mva_original: 140.00, mva_ajustada_int12: 0, mva_ajustada_int4: 0, fundamento_normativo: 'Protocolo ICMS 11/91' }
];

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        await pool.query('DELETE FROM fiscal_regras_st');
        
        let count = 0;
        for (const r of regras) {
            await pool.query(`
                INSERT INTO fiscal_regras_st 
                (uf, item, nome_item, subitem, cest, ncm_sh, descricao, mva_original, mva_ajustada_int12, mva_ajustada_int4, fundamento_normativo)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [r.uf, r.item, r.nome_item, r.subitem, r.cest, r.ncm_sh, r.descricao, r.mva_original, r.mva_ajustada_int12, r.mva_ajustada_int4, r.fundamento_normativo]);
            count++;
        }
        console.log(`${count} Regras Fiscais ST (Base Econet) inseridas com sucesso.`);
    } catch (e) {
        console.error('Erro ao inserir regras:', e);
    } finally {
        await pool.end();
    }
}
main();
