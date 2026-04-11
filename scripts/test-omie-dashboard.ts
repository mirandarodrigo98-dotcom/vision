import axios from 'axios';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/"/g, '').trim();
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const { rows } = await pool.query('SELECT * FROM omie_config');
  const config = rows[0];
  pool.end();

  if (!config) return console.log('No config');

  const payload = {
    call: "ListarContratos",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      pagina: 1,
      registros_por_pagina: 10
    }]
  };

  try {
    const response = await axios.post('https://app.omie.com.br/api/v1/servicos/contrato/', payload);
    console.log(response.data.contratoCadastro[0].cabecalho);
    console.log(response.data.contratoCadastro[0].itensContrato);
  } catch (err: any) {
    console.error(err.response?.data || err.message);
  }
}
run();