
const db = require('better-sqlite3')('vision.db');

const sociosema = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'societario_company_socios'").get();
console.log('societario_company_socios schema:', sociosema ? sociosema.sql : 'Not found');

const phonesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'company_phones'").get();
console.log('company_phones schema:', phonesSchema ? phonesSchema.sql : 'Not found');

const emailsSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'company_emails'").get();
console.log('company_emails schema:', emailsSchema ? emailsSchema.sql : 'Not found');

const categoriesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'contact_categories'").get();
console.log('contact_categories schema:', categoriesSchema ? categoriesSchema.sql : 'Not found');
