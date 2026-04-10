import fs from 'fs';

async function test() {
  const url = "https://cdn.omie.com.br/repository/8be3cd703fc046da1e1bb954f786b360/2804e1fe76796a001096b31b688b04de/nzd_vencto_05_04_2026_doc_1203_bol_157_cli_52914393000142.pdf?response-content-type=application%2Fpdf&AWSAccessKeyId=AKIA4INFFOTW64RNC5N7&Expires=1775823211&Signature=MwQJMytrmnooY2DZtxILYLTsvRM%3D";
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  fs.writeFileSync('dummy.pdf', Buffer.from(base64, 'base64'));
  console.log("Size:", base64.length);
}
test();
