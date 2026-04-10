import fs from 'fs';

async function test() {
  const url = "https://mandeumzap-storage.s3.amazonaws.com/5fbcdb8a-6799-4205-853f-be849d666346/6771f8bc-c3ea-41c1-956b-3036fd18e520.pdf?AWSAccessKeyId=AKIARYNLF2Q6NTLJPUUB&Expires=1775825150&Signature=n1kNvjQJA1P10X6VAu2kRLeWvqo%3D&response-content-disposition=attachment%3B%20filename%3Dboleto.pdf";

  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync('boleto2.pdf', Buffer.from(buffer));
  console.log("Size:", buffer.byteLength);
  const content = fs.readFileSync('boleto2.pdf', 'utf8');
  console.log("Start:", content.substring(0, 50));
}
test();
