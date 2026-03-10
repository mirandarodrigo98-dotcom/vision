
import { NextResponse } from 'next/server';
import { fetchCompanyFromQuestor } from '@/app/actions/integrations/questor-companies';

export async function GET() {
  try {
    const result = await fetchCompanyFromQuestor('107', 'syn');
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
