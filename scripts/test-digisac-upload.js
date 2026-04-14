const fetch = require('node-fetch');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function testDigisacUpload() {
  const configRes = await pool.query('SELECT * FROM digisac_config WHERE id = 1');
  const config = configRes.rows[0];
  
  const dummyPdfBase64 = 'JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCgkJPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzAxIDAwMDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDc2CiUlRU9GCg==';
  
  // Teste 1: Sem prefixo (como está no código atual)
  const res1 = await fetch(`${config.base_url}/api/v1/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      base64: dummyPdfBase64,
      mimetype: 'application/pdf',
      name: 'test_no_prefix.pdf',
      extension: 'pdf'
    })
  });
  const json1 = await res1.json();
  const fileRes1 = await fetch(json1.url);
  const arrayBuffer1 = await fileRes1.arrayBuffer();
  console.log('Sem prefixo Header:', Buffer.from(arrayBuffer1).subarray(0, 50).toString());
  
  // Teste 2: Com prefixo
  const res2 = await fetch(`${config.base_url}/api/v1/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      base64: `data:application/pdf;base64,${dummyPdfBase64}`,
      mimetype: 'application/pdf',
      name: 'test_with_prefix.pdf',
      extension: 'pdf'
    })
  });
  const json2 = await res2.json();
  const fileRes2 = await fetch(json2.url);
  const arrayBuffer2 = await fileRes2.arrayBuffer();
  console.log('Com prefixo Header:', Buffer.from(arrayBuffer2).subarray(0, 50).toString());
  pool.end();
}

testDigisacUpload();