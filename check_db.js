
const db = require('./src/lib/db').default;

(async () => {
  try {
    const res = await db.prepare("SELECT id, razao_social, is_active FROM client_companies WHERE razao_social ILIKE '%am%' LIMIT 20").all();
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
})();
