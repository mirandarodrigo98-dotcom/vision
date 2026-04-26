import * as dotenv from 'dotenv';
dotenv.config();

import db from '../src/lib/db';
import { v4 as uuidv4 } from 'uuid';

async function createRoutine() {
  console.log('Creating Análise Super Simples routine...');
  try {
    const existing = await db.query(`SELECT id FROM questor_syn_routines WHERE system_code = 'ANALISE_SUPER_SIMPLES'`);
    if (existing.rows.length > 0) {
      console.log('Routine already exists.');
      return;
    }

    await db.query(`
      INSERT INTO questor_syn_routines (id, name, action_name, type, description, system_code, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      uuidv4(),
      'Análise Super Simples',
      'TnFisDPAnaliseSSimples', // Assumed, user can change in UI
      'PROCESS',
      'Rotina para buscar Folha de Salários e Encargos quando não há apuração',
      'ANALISE_SUPER_SIMPLES',
      true
    ]);
    
    console.log('Routine created successfully.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

createRoutine();
