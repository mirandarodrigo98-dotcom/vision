import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';

export interface DashboardStats {
  admin?: {
    activeCompanies: number;
    activeClientUsers: number;
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
    leaves?: SubBlockStats;
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

  const permissions = await getUserPermissions();
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
    const companiesCount = Object.values((await db.query('SELECT COUNT(*) FROM client_companies WHERE is_active = 1')).rows[0] || {})[0];
    const companies = Number(companiesCount);
    
    // Active Client Users (changed from Total Clients)
    const activeClientUsersCount = Object.values((await db.query("SELECT COUNT(*) FROM users WHERE role = 'client_user' AND is_active = 1")).rows[0] || {})[0];
    const activeClientUsers = Number(activeClientUsersCount);

    // Helper for Total Requests (Admissions + Dismissals + Vacations + Transfers)
    // We need to sum counts from 4 tables
    const tables = ['admission_requests', 'dismissals', 'vacations', 'transfer_requests'];
    
    const getCount = async (start: Date, end: Date) => {
      let total = 0;
      for (const table of tables) {
        const row = (await db.query(`
          SELECT COUNT(*) as count FROM ${table} 
          WHERE status = 'COMPLETED' AND created_at >= $1 AND created_at < $2
        `, [start.toISOString(), end.toISOString()])).rows[0] as any;
        total += Number(row?.count || 0);
      }
      return total;
    };

    const totalRequestsPrevMonth = await getCount(prevMonthStart, currMonthStart);
    const totalRequestsCurrMonth = await getCount(currMonthStart, nextMonthStart);

    // Chart: Last 12 Months (All types)
    // We fetch each table grouped by month and aggregate in JS
    const getChartData = async (table: string) => {
        return (await db.query(`
            SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count 
            FROM ${table} 
            WHERE status = 'COMPLETED' AND created_at >= $1
            GROUP BY month
        `, [twelveMonthsAgo.toISOString()])).rows as { month: string, count: number }[];
    };

    const chartMap = new Map<string, number>();
    for (const table of tables) {
        const data = await getChartData(table);
        data.forEach(d => {
            chartMap.set(d.month, (chartMap.get(d.month) || 0) + Number(d.count));
        });
    }

    // Generate last 12 months (including empty ones)
    const requestsChart: { month: string; count: number }[] = [];
    const current = new Date(twelveMonthsAgo);
    const endMonth = now.getFullYear() * 12 + now.getMonth();

    while (current.getFullYear() * 12 + current.getMonth() <= endMonth) {
      const year = current.getFullYear();
      const month = current.getMonth() + 1;
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      
      requestsChart.push({
        month: monthStr,
        count: chartMap.get(monthStr) || 0
      });

      current.setMonth(current.getMonth() + 1);
    }

    // Ranking: Top 10 Clients (Last 12 Months)
    // We need to aggregate by company_id across tables
    const getRankingData = async (table: string) => {
        const companyCol = table === 'transfer_requests' ? 'source_company_id' : 'company_id';
        return (await db.query(`
            SELECT cc.nome, COUNT(*) as count 
            FROM ${table} t
            JOIN client_companies cc ON t.${companyCol} = cc.id
            WHERE t.status = 'COMPLETED' AND t.created_at >= $1
            GROUP BY cc.nome
        `, [twelveMonthsAgo.toISOString()])).rows as { nome: string, count: number }[];
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
        activeClientUsers,
        totalRequestsPrevMonth,
        totalRequestsCurrMonth,
        requestsChart,
        topClients
    };
  }

  // ----------------------------------------------------------------------
  // 2. DP BLOCK
  // ----------------------------------------------------------------------
  
  const getSubBlockStats = async (table: string) => {
    let whereClause = "WHERE status = 'COMPLETED'";
    const queryParams: any[] = [];
    
    const companyCol = table === 'transfer_requests' ? 'source_company_id' : 'company_id';

    if (session.role === 'client_user') {
        whereClause += ` AND ${companyCol} IN (SELECT company_id FROM user_companies WHERE user_id = $${queryParams.length + 1})`;
        queryParams.push(session.user_id);
    } else if (session.role === 'operator') {
        whereClause += ` AND (${companyCol} IS NULL OR ${companyCol} NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $${queryParams.length + 1}))`;
        queryParams.push(session.user_id);
    }

    // Counts
    const prevRow = (await db.query(`
        SELECT COUNT(*) as count FROM ${table} ${whereClause} AND created_at >= $${queryParams.length + 1} AND created_at < $${queryParams.length + 2}
    `, [...queryParams, prevMonthStart.toISOString(), currMonthStart.toISOString()])).rows[0] as any;
    const prevMonth = Number(prevRow?.count || 0);

    const currRow = (await db.query(`
        SELECT COUNT(*) as count FROM ${table} ${whereClause} AND created_at >= $${queryParams.length + 1} AND created_at < $${queryParams.length + 2}
    `, [...queryParams, currMonthStart.toISOString(), nextMonthStart.toISOString()])).rows[0] as any;
    const currMonth = Number(currRow?.count || 0);

    // Chart (Last 6 Months)
    const chartData = (await db.query(`
        SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*) as count 
        FROM ${table} 
        ${whereClause} AND created_at >= $${queryParams.length + 1}
        GROUP BY month
        ORDER BY month
    `, [...queryParams, sixMonthsAgo.toISOString()])).rows as { month: string, count: number }[];

    // Fill missing months
    const chart: { month: string; count: number }[] = [];
    const current = new Date(sixMonthsAgo);
    const endMonth = now.getFullYear() * 12 + now.getMonth();
    
    const dataMap = new Map(chartData.map(d => [d.month, Number(d.count)]));

    while (current.getFullYear() * 12 + current.getMonth() <= endMonth) {
        const year = current.getFullYear();
        const month = current.getMonth() + 1;
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
        
        chart.push({
            month: monthStr,
            count: dataMap.get(monthStr) || 0
        });
        current.setMonth(current.getMonth() + 1);
    }

    // Ranking (Top 5)
    let rankingWhere = "WHERE t.status = 'COMPLETED'";
    const rankingParams: any[] = [];
    
    if (session.role === 'client_user') {
        rankingWhere += ` AND t.${companyCol} IN (SELECT company_id FROM user_companies WHERE user_id = $${rankingParams.length + 1})`;
        rankingParams.push(session.user_id);
    } else if (session.role === 'operator') {
        rankingWhere += ` AND (t.${companyCol} IS NULL OR t.${companyCol} NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $${rankingParams.length + 1}))`;
        rankingParams.push(session.user_id);
    }

    const topClientsData = (await db.query(`
        SELECT cc.nome, COUNT(*) as count 
        FROM ${table} t
        JOIN client_companies cc ON t.${companyCol} = cc.id
        ${rankingWhere} AND t.created_at >= $${rankingParams.length + 1}
        GROUP BY cc.nome
        ORDER BY count DESC
        LIMIT 5
    `, [...rankingParams, sixMonthsAgo.toISOString()])).rows as { nome: string, count: number }[];
    
    const topClients = topClientsData.map(d => ({ name: d.nome, count: Number(d.count) }));

    return { prevMonth, currMonth, chart, topClients };
  };

  const dpStats: NonNullable<DashboardStats['dp']> = {};

  // Sub-block 1: Admissions
  if (isAdmin || permissions.includes('admissions.view')) {
    dpStats.admissions = await getSubBlockStats('admission_requests');
  }

  // Sub-block 2: Dismissals
  if (isAdmin || permissions.includes('dismissals.view')) {
    dpStats.dismissals = await getSubBlockStats('dismissals');
  }

  // Sub-block 3: Vacations
  if (isAdmin || permissions.includes('vacations.view')) {
    dpStats.vacations = await getSubBlockStats('vacations');
  }

  // Sub-block 4: Transfers
  if (isAdmin || permissions.includes('transfers.view')) {
    dpStats.transfers = await getSubBlockStats('transfer_requests');
  }

  // Sub-block 5: Leaves
  if (isAdmin || permissions.includes('leaves.view')) {
    dpStats.leaves = await getSubBlockStats('leaves');
  }

  if (Object.keys(dpStats).length > 0) {
    stats.dp = dpStats;
  }

  return stats;
}
