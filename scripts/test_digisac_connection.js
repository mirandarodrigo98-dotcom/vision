const { sendDigisacMessage } = require('../src/app/actions/integrations/digisac');
const db = require('better-sqlite3')('vision.db');

// Mock db for the test if running outside Next.js context
// Mas como estamos importando server action, pode dar erro se não rodar com ts-node e paths configurados.
// Vamos fazer um script simples que simula o fetch para testar a lógica ou apenas um script manual.

// Melhor: criar um script que usa fetch diretamente para testar a conectividade com a API Digisac
// solicitando input do usuário.

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('--- Teste de Conexão Digisac ---');

rl.question('URL Base (ex: https://sua-api.digisac.com.br): ', (baseUrl) => {
  rl.question('Token (Bearer): ', (token) => {
    rl.question('Contact ID (opcional, enter para pular): ', (contactId) => {
      rl.question('Número (se sem Contact ID, ex: 5511999999999): ', (number) => {
          rl.question('Mensagem: ', async (message) => {
            
            const endpoint = `${baseUrl.replace(/\/$/, '')}/api/v1/messages`;
            
            const payload = {
                text: message,
                type: 'chat'
            };

            if (contactId) {
                payload.contactId = contactId;
            } else if (number) {
                payload.number = number;
                // payload.serviceId = '...'; // Precisaria pedir serviceId também
            }

            console.log('\nEnviando requisição...');
            console.log('Endpoint:', endpoint);
            console.log('Payload:', JSON.stringify(payload, null, 2));

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                console.log('\nStatus:', response.status);
                const text = await response.text();
                console.log('Response:', text);

            } catch (error) {
                console.error('Erro:', error.message);
            }

            rl.close();
          });
      });
    });
  });
});
