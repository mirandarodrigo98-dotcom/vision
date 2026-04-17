import db from './src/lib/db';
import { getR2DownloadLink } from './src/lib/r2';

async function test() {
  try {
    const url = await getR2DownloadLink('1eb1072e-27fb-4228-bc97-38a90ad3cf3d-WhatsApp_Image_2026-04-16_at_15.03.25.jpeg');
    console.log('URL:', url);
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit(0);
}
test();