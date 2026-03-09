const net = require('net');

const HOST = 'hcs08305ayy.sn.mynetname.net';
const PORT = 9001;

console.log(`Connecting to ${HOST}:${PORT}...`);

const client = new net.Socket();
client.setTimeout(10000); // 10s timeout

client.connect(PORT, HOST, () => {
    console.log('Connected via TCP!');
    // Send a minimal HTTP request
    const request = `GET /TnInfo/Info HTTP/1.1\r\nHost: ${HOST}:${PORT}\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n`;
    console.log('Sending Request:');
    console.log(request);
    client.write(request);
});

client.on('data', (data) => {
    console.log('Received Data: ' + data.toString());
    client.destroy(); // kill client after server's response
});

client.on('close', () => {
    console.log('Connection closed');
});

client.on('error', (err) => {
    console.error('Connection Error:', err.message);
});

client.on('timeout', () => {
    console.log('Socket Timeout');
    client.destroy();
});