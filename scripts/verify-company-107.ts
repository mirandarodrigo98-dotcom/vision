import db from '@/lib/db';

async function run() {
  try {
    console.log("Consultando empresa '107'...");
    // Usando a sintaxe emulada pelo PostgresAdapter
    const res = await db.prepare("SELECT id, nome, razao_social, code, capital_social_centavos, address_type, address_street, address_neighborhood, address_zip_code, address_number, address_complement, municipio, uf FROM client_companies WHERE code = ?").all('107');
    
    if (res.length === 0) {
        console.log('Nenhuma empresa encontrada com o código 107.');
    } else {
        console.log('Empresa encontrada:');
        console.log(JSON.stringify(res[0], null, 2));
    }
  } catch (err) {
    console.error('Erro ao consultar banco de dados:', err);
  }
}

run();
