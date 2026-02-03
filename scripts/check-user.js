
const db = require('better-sqlite3')('admissao.db');

const admission = db.prepare('SELECT id, user_id, created_at FROM admission_requests ORDER BY created_at DESC LIMIT 1').get();
console.log('Latest Admission:', admission);

if (admission && admission.user_id) {
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(admission.user_id);
    console.log('User linked to admission:', user);
} else {
    console.log('No user linked to this admission.');
}
