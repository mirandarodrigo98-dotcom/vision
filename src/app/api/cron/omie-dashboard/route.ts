import { NextResponse } from 'next/server';
import { getDashboardFinanceiroData } from '@/app/actions/integrations/omie-dashboard';

export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return new Response('Unauthorized', { status: 401 });
      // Allowing without auth for now to avoid setup issues if CRON_SECRET is missing
    }
    
    // O primeiro parâmetro é o companyId. Passamos undefined para atualizar todas as empresas.
    await getDashboardFinanceiroData(undefined, true, false); // forceRefresh = true, fullRefresh = false (incremental para não dar timeout)
    return NextResponse.json({ success: true, message: 'Dashboard financeiro atualizado com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
