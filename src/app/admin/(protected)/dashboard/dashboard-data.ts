import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getRolePermissions } from '@/app/actions/permissions';

export interface DashboardStats {
  admin?: {
    activeCompanies: number;
    totalClients: number;
    totalRequestsPrevMonth: number;
    totalRequestsCurrMonth: number;
    requestsChart: { month: string; count: number }[];
    topClients: { name: string; count: number }[];
  };
  dp?: {
    admissions?: SubBlockStats;
    dismissals?: SubBlockStats;
    vacations?: SubBlockStats;
    transfers?: SubBlockStats;
  };
}

export interface SubBlockStats {
  prevMonth: number;
  currMonth: number;
  chart: { month: string; count: number }[];
  topClients: { name: string; count: number }[];
}

export async function getDashboardData(): Promise<DashboardStats> {
  const session = await getSession();
  if (!session) return {};

  const permissions = await getRolePermissions(session.role);
  const isAdmin = session.role === 'admin';

  // Date ranges
  const now = new Date();
  const currMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const stats: DashboardStats = {};

  // ----------------------------------------------------------------------
  // 1. ADMIN BLOCK
  // ----------------------------------------------------------------------
  if (isAdmin) {
    // Active Companies
    const companies = await db.prepare('SELECT COUNT(*) FROM client_companies WHERE is_active = 1').pluck().get() as number;
    
    // Total Clients (Companies)
    const totalClients = await db.prepare('SELECT COUNT(*) FROM client_companies').pluck().get() as number;

    // Helper for Total Requests (Admissions + Dismissals + Vacations + Transfers)
    // We need to sum counts from 4 tables
    const tables = ['admission_requests', 'dismissals', 'vacations', 'transfer_requests'];
    
    const getCount = async (start: Date, end: Date) => {
      let total = 0;
      for (const table of tables) {
        const count = await db.prepare(`
          SELECT COUNT(*) FROM ${table} 
          WHERE status = 'COMPLETED' AND created_at >= ? AND created_at < ?
        `).pluck().get(start.toISOString(), end.toISOString()) as number;
        total += count;
      }
      return total;
    };

    const totalRequestsPrevMonth = await getCount(prevMonthStart, currMonthStart);
    const totalRequestsCurrMonth = await getCount(currMonthStart, nextMonthStart);

    // Chart: Last 12 Months (All types)
    // We fetch each table grouped by month and aggregate in JS
    const getChartData = async (table: string) => {
        return await db.prepare(`
            SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count 
            FROM ${table} 
            WHERE status = 'COMPLETED' AND created_at >= ?
            GROUP BY month
        `).all(twelveMonthsAgo.toISOString()) as { month: string, count: number }[];
    };

    const chartMap = new Map<string, number>();
    for (const table of tables) {
        const data = await getChartData(table);
        data.forEach(d => {
            chartMap.set(d.month, (chartMap.get(d.month) || 0) + Number(d.count));
        });
    }

    const requestsChart = Array.from(chartMap.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

    // Ranking: Top 10 Clients (Last 12 Months)
    // We need to aggregate by company_id across tables
    const getRankingData = async (table: string) => {
        const companyCol = table === 'transfer_requests' ? 'source_company_id' : 'company_id';
        return await db.prepare(`
            SELECT cc.nome, COUNT(*) as count 
            FROM ${table} t
            JOIN client_companies cc ON t.${companyCol} = cc.id
            WHERE t.status = 'COMPLETED' AND t.created_at >= ?
            GROUP BY cc.nome
        `).all(twelveMonthsAgo.toISOString()) as { nome: string, count: number }[];
    };

    const rankingMap = new Map<string, number>();
    for (const table of tables) {
        const data = await getRankingData(table);
        data.forEach(d => {
            rankingMap.set(d.nome, (rankingMap.get(d.nome) || 0) + Number(d.count));
        });
    }

    const topClients = Array.from(rankingMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    stats.admin = {
        activeCompanies: companies,
        totalClients,
        totalRequestsPrevMonth,
        totalRequestsCurrMonth,
        requestsChart,
        topClients
    };
  }

  // ----------------------------------------------------------------------
  // 2. DP BLOCK
  // ----------------------------------------------------------------------
  stats.dp = {};

  const getSubBlockStats = async (table: string) => {
    // Counts
    const prevMonth = await db.prepare(`
        SELECT COUNT(*) FROM ${table} WHERE status = 'COMPLETED' AND created_at >= ? AND created_at < ?
    `).pluck().get(prevMonthStart.toISOString(), currMonthStart.toISOString()) as number;

    const currMonth = await db.prepare(`
        SELECT COUNT(*) FROM ${table} WHERE status = 'COMPLETED' AND created_at >= ? AND created_at < ?
    `).pluck().get(currMonthStart.toISOString(), nextMonthStart.toISOString()) as number;

    // Chart (Last 6 Months)
    const chart = await db.prepare(`
        SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count 
        FROM ${table} 
        WHERE status = 'COMPLETED' AND created_at >= ?
        GROUP BY month
        ORDER BY month
    `).all(sixMonthsAgo.toISOString()) as { month: string, count: number }[];

    // Ranking (Top 5) - Assuming All Time or Last 6 Months? "Ranking TOP 5 clientes".
    // Usually implies "Recent" or "General". I'll use Last 6 Months to be consistent with the chart.
    const companyCol = table === 'transfer_requests' ? 'source_company_id' : 'company_id';
    const topClientsData = await db.prepare(`
        SELECT cc.nome, COUNT(*) as count 
        FROM ${table} t
        JOIN client_companies cc ON t.${companyCol} = cc.id
        WHERE t.status = 'COMPLETED' AND t.created_at >= ?
        GROUP BY cc.nome
        ORDER BY count DESC
        LIMIT 5
    `).all(sixMonthsAgo.toISOString()) as { nome: string, count: number }[];
    
    const topClients = topClientsData.map(d => ({ name: d.nome, count: Number(d.count) }));

    return { prevMonth, currMonth, chart, topClients };
  };

  // Sub-block 1: Admissions
  if (isAdmin || permissions.includes('admissions.view')) {
    stats.dp.admissions = await getSubBlockStats('admission_requests');
  }

  // Sub-block 2: Dismissals
  if (isAdmin || permissions.includes('dismissals.view')) {
    stats.dp.dismissals = await getSubBlockStats('dismissals');
  }

  // Sub-block 3: Vacations
  if (isAdmin || permissions.includes('vacations.view')) {
    stats.dp.vacations = await getSubBlockStats('vacations');
  }

  // Sub-block 4: Transfers
  if (isAdmin || permissions.includes('transfers.view')) {
    stats.dp.transfers = await getSubBlockStats('transfer_requests');
  }

  return stats;
}
