
console.log("Starting debug script...");

import { fetchCompanyFromQuestor } from '@/app/actions/integrations/questor-companies';

console.log("Imported fetchCompanyFromQuestor");

async function run() {
  try {
    console.log("Fetching company 107 from Questor SYN...");
    const result = await fetchCompanyFromQuestor('107', 'syn');
    
    if (result.error) {
      console.error('Error:', result.error);
    } else {
      console.log('--- RAW DATA (Normalized) ---');
      console.log(JSON.stringify(result, null, 2));
      
      console.log('\n--- KEY FIELDS CHECK ---');
      console.log('Capital Social:', result.data?.company?.capital_social);
      console.log('Address Type:', result.data?.address?.tipo_logradouro);
      console.log('Logradouro:', result.data?.address?.logradouro);
      console.log('Raw Capital:', result.data?.raw?.CAPITALSOCIAL);
      console.log('Raw Tipo Logradouro:', result.data?.raw?.DESCRTIPOLOGRAD);
    }
  } catch (err) {
    console.error('Execution error:', err);
  }
}

run().catch(e => console.error("Unhandled error:", e));
