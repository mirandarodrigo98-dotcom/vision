const fetch = require('node-fetch');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const fs = require('fs');

async function testDigisacUpload() {
  const configRes = await pool.query('SELECT * FROM digisac_config WHERE id = 1');
  const config = configRes.rows[0];
  
  // Real PDF base64 (a very small valid PDF)
  const dummyPdfBase64 = 'JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCgkJPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzAxIDAwMDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDc2CiUlRU9GCg==';

  const base64Data = dummyPdfBase64;
  
  // Wait, number is 5524999135176 from the screenshot (Evandro)
  // Or 5517... wait, user's test number earlier was 551799135176 ?
  // Oh, screenshot says 5524999135176
  const payloadDirect = {
    number: '5524999135176', // test number
    serviceId: config.connection_phone,
    type: 'file',
    file: {
        base64: `data:application/pdf;base64,${base64Data}`, // with prefix?
        mimetype: 'application/pdf',
        name: 'test_direct_with_prefix.pdf'
    }
  };

  const payloadDirectNoPrefix = {
    number: '5524999135176', // test number
    serviceId: config.connection_phone,
    type: 'file',
    file: {
        base64: base64Data, // without prefix
        mimetype: 'application/pdf',
        name: 'test_direct_no_prefix.pdf'
    }
  };

  const msg1 = await fetch(`${config.base_url}/api/v1/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.api_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadDirect)
  });
  console.log('Msg Direct With Prefix:', await msg1.text());

  const msg2 = await fetch(`${config.base_url}/api/v1/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.api_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadDirectNoPrefix)
  });
  console.log('Msg Direct No Prefix:', await msg2.text());

  pool.end();
}

testDigisacUpload();