const db = require('./src/lib/db').default;
try {
  const result = db.prepare("UPDATE client_companies SET code = '1' WHERE nome LIKE '%NZD%'").run();
  console.log('Empresa atualizada. Alterações:', result.changes);
  
  const updated = db.prepare("SELECT id, nome, code FROM client_companies").all();
  console.log('Empresas:', updated);
} catch (error) {
  console.error('Erro:', error);
}
