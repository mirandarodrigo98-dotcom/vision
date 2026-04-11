import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import db from './src/lib/db';

async function run() {
    const res = (await db.query("SELECT id, nome, razao_social, is_active FROM client_companies WHERE nome LIKE '%CF DOS%' OR razao_social LIKE '%CF DOS%'", [])).rows;
    console.log(res);
}
run();