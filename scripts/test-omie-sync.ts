import { getOmieBankSyncStatus } from './src/app/actions/integrations/omie';

async function main() {
    const res = await getOmieBankSyncStatus();
    console.log(res);
}

main();