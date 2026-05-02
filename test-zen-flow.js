require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`SELECT * FROM questor_zen_config LIMIT 1`);
    const config = res.rows[0];
    
    // Test helper functions
    const getZenCategories = async () => {
      const url = `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}/categorias`;
      const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      return await response.json();
    };

    const findZenCategoryByNames = async (moduleName, categoryName) => {
      const categories = await getZenCategories();
      for (const mod of categories) {
        if (mod.Descricao?.toLowerCase() === moduleName.toLowerCase() || !moduleName) {
          for (const cat of mod.Categorias || []) {
            if (cat.Descricao?.toLowerCase() === categoryName.toLowerCase()) {
              return cat.Codigo;
            }
          }
        }
      }
      return null;
    };

    const uploadToZen = async (filename, content) => {
      const url = `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}/upload/${encodeURIComponent(filename)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: content
      });
      return await response.json();
    };

    const getZenClientByCnpj = async (cnpj) => {
      const cleanCnpj = cnpj.replace(/\D/g, '');
      const url = `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}/clientes/${cleanCnpj}`;
      const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.CodigoCliente || null;
    };

    const clientId = await getZenClientByCnpj('58520528000171');
    console.log('Client ID:', clientId);

    const categoryId = await findZenCategoryByNames('Departamento Pessoal', 'Documentos');
    console.log('Category ID:', categoryId);

    const fileId = await uploadToZen('test_doc.csv', 'Col1;Col2\nA;B');
    console.log('File ID:', fileId);

    const payload = {
      CodigoCategoria: categoryId,
      CodigoCliente: clientId,
      CodigoArquivo: fileId,
      Titulo: 'Teste de Envio Via API - Vision',
      Observacao: 'Documento gerado automaticamente.',
      Atributo: {
          DataCompetencia: '202603'
      }
    };

    const url = `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}/documentos`;
    const docResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('Doc response status:', docResponse.status);
    const docText = await docResponse.text();
    console.log('Doc response text:', docText);

  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

run();