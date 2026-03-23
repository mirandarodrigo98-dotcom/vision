import 'dotenv/config';
import db from './src/lib/db';
async function main() {
    try {
        console.log(await db.prepare('SELECT column_name FROM information_schema.columns WHERE table_name = $1').all('ir_declarations'));
    } catch(e) {
        console.log(e);
    }
}
main();