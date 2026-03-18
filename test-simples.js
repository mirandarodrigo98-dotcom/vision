import { fetchSimplesNacionalBilling } from './src/app/actions/integrations/simples-nacional';
import { getSession } from './src/lib/auth';

// mock auth
jest.mock('./src/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ role: 'admin', user_id: '123' })
}));

async function test() {
  const result = await fetchSimplesNacionalBilling({
    companyId: '043f1f33-1ec9-43c9-95e2-6385d38a8e1b', // using some company id? I don't know the company id. 
    startCompetence: '2025-01',
    endCompetence: '2025-12'
  });
  console.log(result);
}

test();