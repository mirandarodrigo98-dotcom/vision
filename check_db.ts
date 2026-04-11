import 'dotenv/config';
import db from './src/lib/db';
async function main() {
    try {
        console.log((await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['ir_declarations'])).rows);
    } catch(e) {
        console.log(e);
    }
}
main();