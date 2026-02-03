import db from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

export default async function AdmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const admission = await db.prepare(`
    SELECT a.*, c.nome as company_name, aa.id as attachment_id, aa.original_name
    FROM admission_requests a
    JOIN client_companies c ON a.company_id = c.id
    LEFT JOIN admission_attachments aa ON a.id = aa.admission_id
    WHERE a.id = ?
  `).get(id) as any;

  if (!admission) {
    return <div>Admissão não encontrada.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/admissions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Detalhes da Admissão</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                <p><span className="font-semibold">Protocolo:</span> {admission.protocol_number}</p>
                <p><span className="font-semibold">Status:</span> {
                  admission.status === 'SUBMITTED' ? 'Enviado' : 
                  admission.status === 'RECTIFIED' ? 'Retificado' :
                  admission.status === 'ERROR' ? 'Erro' : 
                  admission.status === 'DRAFT' ? 'Rascunho' : 
                  admission.status === 'CANCELLED' ? 'Cancelado' : 
                  admission.status === 'EMAILED' ? 'Enviado' :
                  admission.status
                }</p>
                <p><span className="font-semibold">Empresa:</span> {admission.company_name}</p>
                <p><span className="font-semibold">Data Envio:</span> {format(new Date(admission.created_at), 'dd/MM/yyyy HH:mm')}</p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Dados do Funcionário</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                <p><span className="font-semibold">Nome:</span> {admission.employee_full_name}</p>
                <p><span className="font-semibold">Cargo:</span> {admission.job_role}</p>
                <p><span className="font-semibold">Escolaridade:</span> {admission.education_level}</p>
                <p><span className="font-semibold">Data Admissão:</span> {format(new Date(admission.admission_date), 'dd/MM/yyyy')}</p>
                <p><span className="font-semibold">Salário:</span> R$ {(admission.salary_cents / 100).toFixed(2)}</p>
                <p><span className="font-semibold">Jornada:</span> {admission.work_schedule}</p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Benefícios e Contrato</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                <p><span className="font-semibold">Vale Transporte:</span> {admission.has_vt ? 'Sim' : 'Não'}</p>
                {admission.has_vt === 1 && (
                    <div className="pl-4 text-sm text-gray-600">
                        <p>Tarifa: R$ {(admission.vt_tarifa_cents / 100).toFixed(2)}</p>
                        <p>Linha: {admission.vt_linha}</p>
                        <p>Qtd/Dia: {admission.vt_qtd_por_dia}</p>
                    </div>
                )}
                
                <p><span className="font-semibold">Adiantamento:</span> {admission.has_adv ? 'Sim' : 'Não'}</p>
                {admission.has_adv === 1 && (
                    <div className="pl-4 text-sm text-gray-600">
                        <p>Dia: {admission.adv_day}</p>
                        <p>Periodicidade: {admission.adv_periodicity}</p>
                    </div>
                )}

                <p><span className="font-semibold">Experiência:</span> {admission.trial1_days} + {admission.trial2_days} dias</p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Anexos</CardTitle></CardHeader>
            <CardContent>
                {admission.attachment_id ? (
                    <a href={`/api/download/${admission.attachment_id}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="w-full justify-start gap-2">
                            <Download className="h-4 w-4" />
                            {admission.original_name}
                        </Button>
                    </a>
                ) : (
                    <p className="text-muted-foreground">Nenhum anexo encontrado.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
