require('dotenv').config({path: '.env.local'});
process.env.DATABASE_URL = process.env.DATABASE_URL; // just in case
const db = require('./src/lib/db').default;

db.query('SELECT dismissal_date FROM dismissals LIMIT 10')
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
