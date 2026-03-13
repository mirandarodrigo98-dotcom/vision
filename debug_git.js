const { execSync } = require('child_process');
const fs = require('fs');

const logFile = 'debug_git_log.txt';

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

try {
    log('--- DEBUG GIT START ---');
    log('Current directory: ' + process.cwd());
    
    try {
        const gitVersion = execSync('git --version', { encoding: 'utf8' });
        log('Git version: ' + gitVersion.trim());
    } catch (e) {
        log('Git version failed: ' + e.message);
    }

    try {
        const whereGit = execSync('where git', { encoding: 'utf8' });
        log('Where git: ' + whereGit.trim());
    } catch (e) {
        log('Where git failed: ' + e.message);
    }
    
    log('--- DEBUG GIT END ---');
} catch (e) {
    console.error('Fatal error:', e);
}
