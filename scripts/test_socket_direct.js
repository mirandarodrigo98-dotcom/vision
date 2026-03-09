const net = require('net');

const HOST = '179.107.157.198'; // Direct IP
const PORT = 9001;

console.log(`Connecting to ${HOST}:${PORT} (IPv4)...`);

const client = new net.Socket();
client.setTimeout(10000); // 10s timeout

client.connect({ port: PORT, host: HOST, family: 4 }, () => {
    console.log('Connected via TCP!');
    // POST request
    const request = 
        `POST /TnInfo/Info HTTP/1.1\r\n` +
        `Host: ${HOST}:${PORT}\r\n` +
        `Content-Length: 0\r\n` +
        `\r\n`;
    console.log('Sending Request (POST):');
    client.write(request);
});

client.on('data', (data) => {
    console.log('Received Data: ' + data.toString());
    client.destroy();
});

client.on('close', (hadError) => {
    console.log(`Connection closed (Error: ${hadError})`);
});

client.on('error', (err) => {
    console.error('Connection Error:', err.message);
});

client.on('timeout', () => {
    console.log('Socket Timeout - No response');
    client.destroy();
});