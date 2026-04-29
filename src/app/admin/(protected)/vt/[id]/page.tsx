import { AdminVTActions } from '@/components/vt/vt-actions';
import { getTransportVoucherById, approveTransportVoucher, cancelTransportVoucher } from '@/app/actions/transport-vouchers';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function AdminVTViewPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const vt = await getTransportVoucherById(resolvedParams.id);
    if (!vt || vt.status === 'DRAFT') redirect('/admin/vt');

    const totalGeral = vt.employees.reduce((acc: number, curr: any) => acc + (parseFloat(curr.total) || 0), 0);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/vt">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                        </Button>
                    </Link>
                    <h2 className="text-2xl font-bold">Análise de Pedido VT</h2>
                </div>
                {vt.status === 'PENDING' && (
                    <div className="flex gap-2">
                        <AdminVTActions vtId={vt.id} />
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detalhes do Pedido - {vt.company_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded border">
                        <div>
                            <span className="block text-muted-foreground font-semibold">Mês/Ano</span>
                            {vt.reference_month.toString().padStart(2, '0')}/{vt.reference_year}
                        </div>
                        <div>
                            <span className="block text-muted-foreground font-semibold">Data da Solicitação</span>
                            {format(new Date(vt.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                        <div>
                            <span className="block text-muted-foreground font-semibold">Status</span>
                            <span className={\`px-2 py-1 rounded-full text-xs font-semibold
                                \${vt.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                                \${vt.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
                                \${vt.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                            \`}>
                                {vt.status === 'PENDING' ? 'Aguardando' : vt.status === 'COMPLETED' ? 'Concluído' : vt.status === 'CANCELLED' ? 'Cancelado' : vt.status}
                            </span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground font-semibold">Valor Total</span>
                            R$ {totalGeral.toFixed(2).replace('.', ',')}
                        </div>
                    </div>

                    {vt.notes && (
                        <div>
                            <span className="font-semibold text-sm">Observações do Cliente:</span>
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