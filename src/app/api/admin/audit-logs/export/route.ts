import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { format } from 'date-fns';

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
      const logs = await db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all() as Array<{
          id: string;
          timestamp: string;
          actor_email: string;
          role: string;
          action: string;
          entity_type: string;
          entity_id: string;
          success: number;
          error_message: string;
          ip: string;
          user_agent: string;
      }>;

      const csvRows = [
          ['ID', 'Data/Hora', 'Ator (Email)', 'Role', 'Ação', 'Tipo Entidade', 'ID Entidade', 'Sucesso', 'Mensagem Erro', 'IP', 'User Agent']
      ];

      logs.forEach(log => {
          csvRows.push([
              log.id,
              format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
              log.actor_email || '',
              log.role || '',
              log.action || '',
              log.entity_type || '',
              log.entity_id || '',
              log.success ? 'SIM' : 'NAO',
              log.error_message || '',
              log.ip || '',
              `"${(log.user_agent || '').replace(/"/g, '""')}"` // Escape quotes
          ]);
      });

      const csvContent = csvRows.map(row => row.join(',')).join('\n');

      return new NextResponse(csvContent, {
          headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="audit-logs-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv"`,
          },
      });

  } catch (error) {
      console.error('Export Error:', error);
      return new NextResponse('Error generating CSV', { status: 500 });
  }
}
