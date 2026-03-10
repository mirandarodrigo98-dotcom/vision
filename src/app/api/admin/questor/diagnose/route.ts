import { NextResponse } from 'next/server';
import { diagnoseQuestorAuth } from '@/app/actions/integrations/questor-diagnostics';

export async function GET() {
  const result = await diagnoseQuestorAuth();
  return NextResponse.json(result);
}
