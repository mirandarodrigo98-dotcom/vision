import { getDashboardData, DashboardStats, SubBlockStats } from './dashboard-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  FileText, 
  TrendingUp, 
  UserPlus, 
  UserMinus, 
  Plane, 
  Briefcase,
  ArrowRightLeft,
  Stethoscope
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default async function AdminDashboard() {
  const stats = await getDashboardData();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight text-primary">Painel Vision</h1>
      
      {/* BLOCO 1: ADMINISTRAÇÃO */}
      {stats.admin && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-secondary" />
            <h2 className="text-xl font-semibold text-primary">Administração</h2>
          </div>
          <Separator className="bg-primary/20" />
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Empresas Ativas" 
              value={stats.admin.activeCompanies} 
              icon={Building2} 
            />
            <StatCard 
              title="Usuário Cliente" 
              value={stats.admin.activeClientUsers} 
              icon={Users} 
            />
            <StatCard 
              title="Solicitações (Mês Anterior)" 
              value={stats.admin.totalRequestsPrevMonth} 
              icon={FileText} 
              subtext="Concluídas"
            />
            <StatCard 
              title="Solicitações (Mês Atual)" 
              value={stats.admin.totalRequestsCurrMonth} 
              icon={TrendingUp} 
              subtext="Concluídas"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard 
              title="Solicitações (Últimos 12 Meses)" 
              data={stats.admin.requestsChart} 
            />
            <RankingCard 
              title="TOP 10 Clientes (Solicitações)" 
              data={stats.admin.topClients} 
            />
          </div>
        </section>
      )}

      {/* BLOCO 2: DEPARTAMENTO PESSOAL */}
      {stats.dp && (
        <section className="space-y-6">
          <div className="flex items-center gap-2 mt-8">
            <Briefcase className="h-6 w-6 text-secondary" />
            <h2 className="text-xl font-semibold text-primary">Departamento Pessoal</h2>
          </div>
          <Separator className="bg-primary/20" />

          {/* Subbloco 1: Admissões */}
          {stats.dp.admissions && (
            <SubBlock 
              title="Admissões" 
              icon={UserPlus} 
              stats={stats.dp.admissions} 
            />
          )}

          {/* Subbloco 2: Demissões */}
          {stats.dp.dismissals && (
            <SubBlock 
              title="Demissões" 
              icon={UserMinus} 
              stats={stats.dp.dismissals} 
            />
          )}

          {/* Subbloco 3: Férias */}
          {stats.dp.vacations && (
            <SubBlock 
              title="Férias" 
              icon={Plane} 
              stats={stats.dp.vacations} 
            />
          )}

          {/* Subbloco 4: Transferências */}
          {stats.dp.transfers && (
            <SubBlock 
              title="Transferências" 
              icon={ArrowRightLeft} 
              stats={stats.dp.transfers} 
            />
          )}

          {/* Subbloco 5: Afastamentos */}
          {stats.dp.leaves && (
            <SubBlock 
              title="Afastamentos" 
              icon={Stethoscope} 
              stats={stats.dp.leaves} 
            />
          )}
        </section>
      )}
    </div>
  );
}

// --- Componentes Auxiliares ---

function StatCard({ title, value, icon: Icon, subtext }: { title: string, value: number, icon: any, subtext?: string }) {
  return (
    <Card className="border-primary/10 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground line-clamp-2 min-h-[3rem] flex items-center">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary mt-1" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">
          {isNaN(Number(value)) ? 0 : Number(value)}
        </div>
        {subtext ? (
          <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        ) : (
          <div className="h-5 mt-1" aria-hidden="true" />
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, data }: { title: string, data: { month: string, count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  
  return (
    <Card className="border-primary/10 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-[240px] w-full flex items-end gap-1 pt-4 pb-8 px-2">
          {data.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              Sem dados
            </div>
          ) : (
            data.map((item) => (
              <div key={item.month} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group min-w-0">
                <div 
                  className="w-full max-w-[16px] bg-secondary/80 rounded-t-sm relative transition-all duration-500 hover:bg-secondary min-h-[4px]" 
                  style={{ height: `${(item.count / max) * 100}%` }}
                  suppressHydrationWarning
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {Number(item.count)}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap -rotate-45 origin-center translate-y-3">
                  {(() => {
                    const [year, month] = item.month.split('-');
                    return `${month}/${year.slice(-2)}`;
                  })()}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RankingCard({ title, data }: { title: string, data: { name: string, count: number }[] }) {
  return (
    <Card className="border-primary/10 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium truncate" title={item.name}>{item.name}</span>
                </div>
                <span className="text-sm font-bold text-secondary">{Number(item.count)}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SubBlock({ title, icon: Icon, stats }: { title: string, icon: any, stats: SubBlockStats }) {
  return (
    <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-gray-800">{title}</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Mês Anterior" 
              value={stats.prevMonth} 
              icon={FileText} 
              subtext="Concluídas"
            />
            <StatCard 
              title="Mês Atual" 
              value={stats.currMonth} 
              icon={TrendingUp} 
              subtext="Concluídas"
            />
            <div className="md:col-span-2 lg:col-span-2 row-span-2">
                 <div className="grid gap-4 h-full">
                    <ChartCard 
                        title={`Evolução (6 Meses)`} 
                        data={stats.chart} 
                    />
                 </div>
            </div>
            <div className="md:col-span-2 lg:col-span-2">
                <RankingCard 
                    title={`TOP 5 Clientes`} 
                    data={stats.topClients} 
                />
            </div>
        </div>
        <Separator className="bg-gray-100" />
    </div>
  );
}
