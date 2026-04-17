import db from './src/lib/db';
import { getR2DownloadLink } from './src/lib/r2';

async function run() {
    const { rows: atts } = await db.query(
        'SELECT storage_path, original_name FROM admission_attachments WHERE admission_id = $1',
        ['73b4d899-71a7-40f9-a61d-964191b8586d']
    );

    for (const att of atts) {
        const url = await getR2DownloadLink(att.storage_path);
        const res = await fetch(url);
        console.log(att.original_name, res.status);
    }
    process.exit(0);
}
run();