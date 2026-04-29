const http = require('http');

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/admin/dismissals',
  method: 'GET',
  headers: {
    'Cookie': 'session_id=test-session-flavia'
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    // Write body to file
    require('fs').writeFileSync('response.html', body);
    console.log('Saved to response.html');
  });
});
req.on('error', e => console.error(e));
req.end();