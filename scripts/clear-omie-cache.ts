import db from '../src/lib/db';

async function clearCache() {
    try {
        await db.query("DELETE FROM omie_dashboard_cache");
        console.log("Cache do Omie apagado com sucesso do banco de dados!");
        process.exit(0);
    } catch (e) {
        console.error("Erro ao apagar cache:", e);
        process.exit(1);
    }
}

clearCache();