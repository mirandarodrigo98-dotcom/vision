const fs = require('fs');

function splitFile(folder) {
  const pagePath = 'src/app/admin/(protected)/financeiro/' + folder + '/page.tsx';
  const clientPath = 'src/app/admin/(protected)/financeiro/' + folder + '/client.tsx';
  
  const content = fs.readFileSync(pagePath, 'utf-8');
  
  const serverStart = content.indexOf('export default async function');
  
  const serverEndMatch = content.match(/return <CobrancaClient [^>]+>;\r?\n}/);
  const serverEnd = serverEndMatch.index + serverEndMatch[0].length;
  
  let serverCode = content.substring(serverStart, serverEnd);
  serverCode = "import { getSession } from '@/lib/auth';\nimport { redirect } from 'next/navigation';\nimport { getUserPermissions } from '@/app/actions/permissions';\nimport { CobrancaClient } from './client';\n\n" + serverCode;
  
  let clientCode = content.substring(0, serverStart);
  clientCode += content.substring(serverEnd);
  
  clientCode = clientCode.replace(/import \{ getUserPermissions \} from '@\/app\/actions\/permissions';\r?\n/, '');
  
  clientCode = clientCode.replace('function CobrancaClient', 'export function CobrancaClient');
  
  fs.writeFileSync(pagePath, serverCode);
  fs.writeFileSync(clientPath, clientCode);
  console.log('Split ' + folder + ' successfully.');
}

splitFile('cobranca');
splitFile('cobranca-consultoria');
