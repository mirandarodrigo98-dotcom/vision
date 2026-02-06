
import db from '../src/lib/db';

async function main() {
    const setting = await db.prepare("SELECT value FROM settings WHERE key = 'NZD_DEST_EMAIL'").get() as { value: string };
    console.log('NZD_DEST_EMAIL:', setting?.value);
}

main();
