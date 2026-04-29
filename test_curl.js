const cp = require('child_process');

async function run() {
  try {
    const output = cp.execSync('curl -s -i http://localhost:3000/admin/dismissals').toString();
    console.log(output.substring(0, 1000));
  } catch (e) {
    console.error(e);
  }
}
run();