import db from './src/lib/db';

jest.mock('./src/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ role: 'admin', user_id: 'test' })
}));

const { fetchSimplesNacionalBilling } = require('./src/app/actions/integrations/simples-nacional');

test('update db', async () => {
  const result = await fetchSimplesNacionalBilling({
    companyId: '36ba042a-85a1-4214-9ced-fafba7277617', 
    startCompetence: '2024-01',
    endCompetence: '2024-12'
  });
  console.log(result);

  const rows = await db.prepare('SELECT competence, rpa_cash FROM simples_nacional_billing WHERE company_id = ? AND competence >= ? ORDER BY competence').all('36ba042a-85a1-4214-9ced-fafba7277617', '2024-01');
  console.log(rows);
});