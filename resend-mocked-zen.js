require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const configRes = await pool.query(`SELECT * FROM questor_zen_config LIMIT 1`);
    const config = configRes.rows[0];
    if (!config) throw new Error('Zen config missing');

    const protocolToFind = 'ZEN-202605-4124';
    const pvRes = await pool.query(`SELECT * FROM payroll_variables WHERE zen_protocol = $1`, [protocolToFind]);
    
    if (pvRes.rowCount === 0) {
      console.log(`Registro com protocolo ${protocolToFind} nao encontrado no banco.`);
      return;
    }

    const record = pvRes.rows[0];
    console.log(`Registro encontrado! ID: ${record.id}`);

    const companyId = record.company_id;
    const monthRef = record.month_reference;
    const eventsData = typeof record.events_data === 'string' ? JSON.parse(record.events_data) : record.events_data;

    // 1. Get Company CNPJ
    const compRes = await pool.query(`SELECT cnpj FROM client_companies WHERE id = $1`, [companyId]);
    if (compRes.rowCount === 0) throw new Error('Empresa nao encontrada');
    const company = compRes.rows[0];
    const cleanCnpj = String(company.cnpj).replace(/\D/g, '');

    // 2. Get Employees
    const empRes = await pool.query(`SELECT id, code FROM employees WHERE company_id = $1`, [companyId]);
    const empMap = {};
    empRes.rows.forEach(e => { empMap[e.id] = e.code || ''; });

    // 3. Build CSV
    let csvContent = 'CodigoEmpregado;CodigoEvento;Valor\n';
    let hasData = false;

    for (const [empId, events] of Object.entries(eventsData.employeeValues || {})) {
      const empCode = empMap[empId];
      if (!empCode) continue;
      for (const [evtCode, value] of Object.entries(events)) {
        if (value && String(value).trim() !== '') {
          csvContent += `${empCode};${evtCode};${value}\n`;
          hasData = true;
        }
      }
    }

    if (!hasData) throw new Error('Nenhum dado valido para enviar.');
    console.log('--- CONTEUDO CSV ---');
    console.log(csvContent);
    console.log('--------------------');

    // Zen API Helpers
    const buildUrl = (path) => `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}${path}`;

    // 4. Upload
    const filename = `variaveis_folha_reenvio_${companyId}_${monthRef}_${Date.now()}.csv`;
    console.log('Realizando upload:', filename);
    const uploadRes = await fetch(buildUrl(`/upload/${encodeURIComponent(filename)}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: csvContent
    });
    if (!uploadRes.ok) throw new Error('Upload failed: ' + await uploadRes.text());
    const fileId = await uploadRes.json();
    console.log('Arquivo recebido no Zen. ID:', fileId);

    // 5. Get Client
    const clientRes = await fetch(buildUrl(`/clientes/${cleanCnpj}`));
    if (!clientRes.ok) throw new Error('Client not found: ' + cleanCnpj);
    const clientData = await clientRes.json();
    const clientId = clientData.CodigoCliente;
    console.log('Cliente localizado no Zen. ID:', clientId);

    // 6. Get Category
    const catRes = await fetch(buildUrl(`/categorias`));
    const categories = await catRes.json();
    let categoryId = null;
    for (const mod of categories) {
      if (mod.Descricao?.toLowerCase() === 'departamento pessoal') {
        for (const cat of mod.Categorias || []) {
          if (cat.Descricao?.toLowerCase() === 'documentos') {
            categoryId = cat.Codigo;
          }
        }
      }
    }
    if (!categoryId) throw new Error('Category not found');
    console.log('Categoria "Departamento Pessoal > Documentos" localizada. ID:', categoryId);

    // 7. Send Document
    const [yyyy, mm] = monthRef.split('-');
    const zenCompetencia = `${mm}/${yyyy}`;
    const payload = {
      CodigoCategoria: categoryId,
      CodigoCliente: clientId,
      CodigoArquivo: fileId,
      Titulo: `Variaveis da Folha - ${monthRef} (Reenvio Manual)`,
      Observacao: 'Arquivo reenviado automaticamente pelo Vision para corrigir protocolo de testes.',
      Atributo: { DataCompetencia: zenCompetencia }
    };

    console.log('Vinculando documento...');
    const docRes = await fetch(buildUrl(`/documentos`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!docRes.ok) throw new Error('Doc send failed: ' + await docRes.text());
    const protocol = (await docRes.text()).replace(/"/g, '');
    console.log('PROTOCOLO REAL GERADO NO ZEN:', protocol);

    // 8. Update DB
    await pool.query(`UPDATE payroll_variables SET zen_protocol = $1 WHERE id = $2`, [protocol, record.id]);
    console.log('Banco de dados atualizado com sucesso! (Antigo: ZEN-202605-4124 -> Novo:', protocol + ')');

  } catch (err) {
    console.error('ERRO CRITICO:', err.message);
  } finally {
    pool.end();
  }
}

run();
