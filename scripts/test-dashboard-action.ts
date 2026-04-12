import { getDashboardFinanceiroData } from '../src/app/actions/integrations/omie-dashboard';

async function main() {
  console.log('Fetching dashboard data...');
  try {
    const res = await getDashboardFinanceiroData(true, true);
    console.log('Finished getDashboardFinanceiroData');
    if (res && res.data) {
       console.log('12 Months Caixa:');
       res.data.blocoCaixa.ultimos12Meses.forEach((m: any) => console.log(`${m.label}: ${m.value}`));
       console.log('12 Months Competencia:');
       res.data.blocoCompetencia.ultimos12Meses.forEach((m: any) => console.log(`${m.label}: ${m.value}`));
       console.log('Honorarios:', res.data.blocoHonorarios);
    }
  } catch (e) {
    console.error('Error caught in main:', e);
  }
}

main().catch(console.error);
