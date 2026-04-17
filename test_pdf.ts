import db from './src/lib/db';
import { getR2DownloadLink } from './src/lib/r2';
import PDFParser from 'pdf2json';

async function run() {
  try {
    const r = await db.query("SELECT receipt_attachment_url as storage_path FROM ir_declarations WHERE receipt_attachment_url IS NOT NULL ORDER BY created_at DESC LIMIT 1");
    if (!r.rows[0]) {
      console.log('Not found');
      return;
    }
    const url = await getR2DownloadLink(r.rows[0].storage_path);
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const p = new PDFParser(this, 1);
    p.on('pdfParser_dataReady', d => {
      const raw = p.getRawTextContent();
      const idx = raw.indexOf('CÓDIGO DO BANCO');
      if (idx !== -1) {
        console.log(raw.substring(Math.max(0, idx - 100), idx + 500));
      } else {
        console.log(raw.substring(0, 1000));
      }
      process.exit(0);
    });
    p.parseBuffer(buf);
  } catch(e) {
    console.error(e);
  }
}
run();