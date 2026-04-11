import db from '../lib/db';

async function getLayout() {
  try {
    const routine = (await db.query("SELECT layout_content FROM questor_syn_routines WHERE system_code = 'CONTABIL_IMPORT'", [])).rows[0];
    
    if (routine) {
      console.log(routine.layout_content.toString('utf-8'));
    } else {
      console.log("Rotina não encontrada.");
    }
  } catch (error) {
    console.error("Erro:", error);
  }
}

getLayout();
