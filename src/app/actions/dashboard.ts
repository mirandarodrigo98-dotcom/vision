'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export type DashboardMetrics = {
  lastMonth: {
    admissions: number;
    dismissals: number;
    vacations: number;
    transfers: number;
  };
  currentMonth: {
    admissions: number;
    dismissals: number;
    vacations: number;
    transfers: number;
  };
  last12Months: {
    admissions: number;
    dismissals: number;
    vacations: number;
    transfers: number;
  };
};

export async function getDashboardMetrics(): Promise<DashboardMetrics | null> {
  const session = await getSession();
  if (!session || !session.active_company_id) return null;

  const companyId = session.active_company_id;
  const now = new Date();

  // Dates
  const currentMonthStart = startOfMonth(now);
  
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  
  const last12MonthsStart = subMonths(now, 12);

  // Helper for counts
  async function getCounts(startDate: Date, endDate?: Date) {
    const params: any[] = [companyId, startDate.toISOString()];
    let dateFilter = `created_at >= ?`;
    
    if (endDate) {
      dateFilter += ` AND created_at <= ?`;
      params.push(endDate.toISOString());
    }

    // Admissions
    const admissions = await db.prepare(`
      SELECT COUNT(*) as total FROM admission_requests 
      WHERE company_id = ? AND ${dateFilter} AND status NOT IN ('DRAFT', 'ERROR')
    `).get(...params) as { total: number };

    // Dismissals
    const dismissals = await db.prepare(`
      SELECT COUNT(*) as total FROM dismissals 
      WHERE company_id = ? AND ${dateFilter} AND status NOT IN ('DRAFT')
    `).get(...params) as { total: number };

    // Vacations
    const vacations = await db.prepare(`
      SELECT COUNT(*) as total FROM vacations 
      WHERE company_id = ? AND ${dateFilter} AND status NOT IN ('DRAFT')
    `).get(...params) as { total: number };

    // Transfers (Source Company)
    // Counting transfers initiated by this company
    const transfers = await db.prepare(`
      SELECT COUNT(*) as total FROM transfer_requests 
      WHERE source_company_id = ? AND ${dateFilter} AND status NOT IN ('DRAFT')
    `).get(...params) as { total: number };

    return {
      admissions: Number(admissions.total),
      dismissals: Number(dismissals.total),
      vacations: Number(vacations.total),
      transfers: Number(transfers.total)
    };
  }

  const [lastMonth, currentMonth, last12Months] = await Promise.all([
    getCounts(lastMonthStart, lastMonthEnd),
    getCounts(currentMonthStart),
    getCounts(last12MonthsStart)
  ]);

  return {
    lastMonth,
    currentMonth,
    last12Months
  };
}
