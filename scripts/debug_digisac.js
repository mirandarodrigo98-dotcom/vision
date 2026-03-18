const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Read .env file
const envPath = path.resolve(__dirname, '../.env');
let dbUrl = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=(.*)/);
  if (match) {
    dbUrl = match[1].trim();
    // Remove quotes if present
    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
      dbUrl = dbUrl.slice(1, -1);
    }
  }
} catch (e) {
  console.error('Error reading .env:', e.message);
  process.exit(1);
}

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

// Handle SSL for production/Neon
const isNeon = dbUrl.includes('neon.tech');
const sslConfig = isNeon ? { rejectUnauthorized: false } : false;

const client = new Client({
  connectionString: dbUrl,
  ssl: sslConfig
});

async function makeRequest(url, token) {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

async function run() {
  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query('SELECT * FROM digisac_config WHERE id = 1');
    const config = res.rows[0];

    if (!config) {
        console.error('No Digisac config found.');
        return;
    }

    console.log('Digisac Config:', {
        base_url: config.base_url,
        connection_phone: config.connection_phone,
        is_active: config.is_active,
        api_token_preview: config.api_token ? config.api_token.substring(0, 10) + '...' : 'null'
    });

    const baseUrl = config.base_url.replace(/\/$/, '');
    const token = config.api_token;

    // Test 1: Get Services
    console.log('\n--- Fetching Services (/api/v1/services) ---');
    try {
        const services = await makeRequest(`${baseUrl}/api/v1/services`, token);
        console.log('Status:', services.status);
        if (services.data && Array.isArray(services.data)) {
            console.log('Services found:', services.data.length);
            services.data.forEach(s => {
                console.log(`- Service: ${s.name} (ID: ${s.id})`);
                if (s.data && s.data.number) {
                    console.log(`  Number: ${s.data.number}`);
                }
            });
        } else {
            console.log('Data:', JSON.stringify(services.data, null, 2));
        }
    } catch (e) {
        console.error('Error fetching services:', e.message);
    }

    // Test 2: Get Connections (sometimes called connections)
    console.log('\n--- Fetching Connections (/api/v1/connections) ---');
    try {
        const connections = await makeRequest(`${baseUrl}/api/v1/connections`, token);
        console.log('Status:', connections.status);
        console.log('Data:', JSON.stringify(connections.data, null, 2));
    } catch (e) {
        console.error('Error fetching connections:', e.message);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
