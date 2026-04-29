import { getTransportVoucherById } from '@/app/actions/transport-vouchers';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getUserPermissions } from '@/app/actions/permissions';

export const dynamic = 'force-dynamic';

export default async function ClientVTViewPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const session = await getSession();
    if (!session || session.role !== 'client_user') redirect('/login');

    const permissions = await getUserPermissions();
    if (!permissions.includes('vt.view')) redirect('/app');

    const vt = await getTransportVoucherById(resolvedParams.id);
    if (!vt) redirect('/app/vt');
    
    if (vt.company_id !== session.active_company_id) redirect('/app/vt');

    const totalGeral = vt.employees.reduce((acc: number, curr: any) => acc + (parseFloat(curr.total) || 0), 0);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/app/vt">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                        </Button>
                    </Link>
                    <h2 className="text-2xl font-bold">Detalhes do Pedido VT</h2>
                </div>
                {vt.status === 'DRAFT' && permissions.includes('vt.create') && (
                    <div className="flex gap-2">
                        <Link href={\`/app/vt/\${vt.id}/edit\`}>
                            <Button variant="outline">
                                <Edit className="h-4 w-4 mr-2" /> Editar Rascunho
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pedido Referência {vt.reference_month.toString().padStart(2, '0')}/{vt.reference_year}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded border">
                        <div>
                            <span className="block text-muted-foreground font-semibold">Data da Solicitação</span>
                            {format(new Date(vt.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                        <div>
                            <span className="block text-muted-foreground font-semibold">Status</span>
                            <span className={\`px-2 py-1 rounded-full text-xs font-semibold
                                \${vt.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                                \${vt.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                                \${vt.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
                                \${vt.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                            \`}>
                                {vt.status === 'DRAFT' ? 'Rascunho' : vt.status === 'PENDING' ? 'Enviado/Aguardando' : vt.status === 'COMPLETED' ? 'Concluído' : vt.status === 'CANCELLED' ? 'Cancelado' : vt.status}
                            </span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground font-semibold">Total de Funcionários</span>
                            {vt.employees.length}
                        </div>
                        <div>
                            <span className="block text-muted-foreground font-semibold">Valor Total</span>
                            R$ {totalGeral.toFixed(2).replace('.', ',')}
                        </div>
                    </div>

                    {vt.notes && (
                        <div>
                            <span className="font-semibold text-sm">Observações do Pedido:</span>
                            <p className="text-sm bg-slate-50 p-3 rounded mt-1 border">{vt.notes}</p>
                        </div>
                    )}

                    <div className="border rounded-md overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>Cód.</TableHead>
                                    <TableHead>Funcionário</TableHead>
                                    <TableHead>CPF</TableHead>
                                    <TableHead className="text-right">Qtd.</TableHead>
                                    <TableHead className="text-right">Valor Unit.</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Linha</TableHead>
                                    <TableHead>Obs.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vt.employees.map((r: any) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.employee_code || '-'}</TableCell>
                                        <TableCell>{r.employee_name}</TableCell>
                                        <TableCell>{r.employee_cpf || '-'}</TableCell>
                                        <TableCell className="text-right">{r.quantity}</TableCell>
                                        <TableCell className="text-right">R$ {parseFloat(r.value || 0).toFixed(2).replace('.', ',')}</TableCell>
                                        <TableCell className="text-right font-semibold">R$ {parseFloat(r.total || 0).toFixed(2).replace('.', ',')}</TableCell>
                                        <TableCell>{r.line || '-'}</TableCell>
                                        <TableCell>{r.observation || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}