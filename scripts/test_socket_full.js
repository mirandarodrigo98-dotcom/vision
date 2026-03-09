const net = require('net');

const HOST = 'hcs08305ayy.sn.mynetname.net';
const PORT = 9001;
const PATH = '/TnInfo/Info'; // Try root path '/' if this fails

console.log(`Connecting to ${HOST}:${PORT}...`);

const client = new net.Socket();
client.setTimeout(15000); // 15s timeout

client.connect(PORT, HOST, () => {
    console.log('Connected via TCP!');
    
    // Mimic Chrome 122 exactly
    const request = 
        `GET ${PATH} HTTP/1.1\r\n` +
        `Host: ${HOST}:${PORT}\r\n` +
        `Connection: keep-alive\r\n` +
        `Cache-Control: max-age=0\r\n` +
        `Upgrade-Insecure-Requests: 1\r\n` +
        `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36\r\n` +
        `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8\r\n` +
        `Accept-Encoding: gzip, deflate\r\n` +
        `Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7\r\n` +
        `\r\n`;

    console.log('Sending Request (Full Chrome Headers):');
    // console.log(request); // Too verbose to log full headers every time
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
    console.log('Socket Timeout - No data received in 15s');
    client.destroy();
});