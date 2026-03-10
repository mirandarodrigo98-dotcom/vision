
import db from '@/lib/db';
import { fetchCompanyFromQuestor } from '@/app/actions/integrations/questor-companies';

async function run() {
  try {
    console.log("Fetching company 107 from Questor SYN...");
    const result = await fetchCompanyFromQuestor('107', 'syn');
    
    if (result.error) {
      console.error('Error fetching from Questor:', result.error);
      return;
    }

    const data = result.data;
    if (!data) {
        console.error('No data returned');
        return;
    }

    console.log('Questor Data:', {
        capital: data.company.capital_social,
        address_type: data.address.tipo_logradouro,
        logradouro: data.address.logradouro
    });

    // Calculate capital_social_centavos
    const capitalSocial = data.company.capital_social || 0;
    const capitalSocialCentavos = Math.round(capitalSocial * 100);

    const addressType = data.address.tipo_logradouro || '';

    console.log('Updating DB for company 107...');
    console.log(`Setting capital_social_centavos = ${capitalSocialCentavos}`);
    console.log(`Setting address_type = '${addressType}'`);

    const stmt = db.prepare(`
        UPDATE client_companies 
        SET 
            capital_social_centavos = ?,
            address_type = ?,
            updated_at = datetime('now')
        WHERE code = '107'
    `);

    const info = stmt.run(capitalSocialCentavos, addressType);
    
    console.log('Update result:', info);

    // Verify
    const verified = await db.prepare("SELECT capital_social_centavos, address_type FROM client_companies WHERE code = '107'").get();
    console.log('Verified DB Data:', verified);

  } catch (err) {
    console.error('Execution error:', err);
  }
}

run();
