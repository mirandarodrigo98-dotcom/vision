const tls = require('tls');

const HOST = 'hcs08305ayy.sn.mynetname.net';
const PORT = 9001;

console.log(`Connecting (TLS) to ${HOST}:${PORT}...`);

const options = {
    rejectUnauthorized: false // Ignore self-signed certs
};

const client = tls.connect(PORT, HOST, options, () => {
    console.log('Connected via TLS!');
    // Send a minimal HTTP request inside TLS tunnel
    const request = `GET /TnInfo/Info HTTP/1.1\r\nHost: ${HOST}:${PORT}\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n`;
    console.log('Sending Request:');
    console.log(request);
    client.write(request);
});

client.on('data', (data) => {
    console.log('Received Data: ' + data.toString());
    client.destroy();
});

client.on('end', () => {
    console.log('Connection ended');
});

client.on('error', (err) => {
    console.error('Connection Error:', err.message);
});

client.setTimeout(10000);
client.on('timeout', () => {
    console.log('Socket Timeout');
    client.destroy();
});