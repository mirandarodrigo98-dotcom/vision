const cp = require('child_process');

async function run() {
  const server = cp.spawn('npm', ['run', 'dev'], { shell: true });
  server.stdout.on('data', data => console.log(data.toString()));
  server.stderr.on('data', data => console.error(data.toString()));
  
  setTimeout(() => {
    console.log('Curling...');
    cp.exec('curl -s -i -H "Cookie: session_id=test-session-flavia" http://127.0.0.1:3000/admin/dismissals', (err, stdout, stderr) => {
      console.log('CURL done');
      setTimeout(() => server.kill(), 3000);
    });
  }, 15000);
}

run();