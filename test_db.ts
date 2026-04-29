import * as dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
import db from './src/lib/db';

db.query('SELECT dismissal_date FROM dismissals LIMIT 10')
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
