'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash, Users, Loader2 } from 'lucide-react';
import { IRPartner, getIRPartners, createIRPartner, updateIRPartner, deleteIRPartner } from '@/app/actions/ir-partners';

export function PartnersDialog() {
  const [open, setOpen] = useState(false);
  const [partners, setPartners] = useState<IRPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    commission_percent: '',
    email: '',
    phone: '',
    payment_data: ''
  });

  const loadPartners = async () => {
    setLoading(true);
    try {
      const data = await getIRPartners();
      setPartners(data);
    } catch (e) {
      toast.error('Erro ao carregar parceiros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPartners();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      commission_percent: '',
      email: '',
      phone: '',
      payment_data: ''
    });
  };

  const handleEdit = (partner: IRPartner) => {
    setEditingId(partner.id);
    setFormData({
      name: partner.name,
      commission_percent: partner.commission_percent.toString(),
      email: partner.email || '',
      phone: partner.phone || '',
      payment_data: partner.payment_data || ''
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este parceiro?')) return;
    
    setLoading(true);
    try {
      const res = await deleteIRPartner(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Parceiro excluído com sucesso');
        loadPartners();
      }
    } catch (e) {
      toast.error('Erro ao excluir');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.commission_percent) {
      toast.error('Nome e Percentual são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        commission_percent: parseFloat(formData.commission_percent.replace(',', '.')),
        email: formData.email,
        phone: formData.phone,
        payment_data: formData.payment_data
      };

      let res;
      if (editingId) {
        res = await updateIRPartner(editingId, payload);
      } else {
        res = await createIRPartner(payload);
      }

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(editingId ? 'Parceiro atualizado' : 'Parceiro criado');
        resetForm();
        loadPartners();
      }
    } catch (e) {
      toast.error('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Parceiros
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[1600px] max-h-[85vh] overflow-y-auto px-10 py-10">
        <DialogHeader>
          <DialogTitle>Cadastro de Parceiros (Indicação IR)</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Form */}
          <div className="md:col-span-2 border-r pr-6">
            <h3 className="font-semibold mb-4">{editingId ? 'Editar Parceiro' : 'Novo Parceiro'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Nome *</Label>
                <Input className="h-11 text-base" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Percentual de Premiação (%) *</Label>
                <Input className="h-11 text-base" type="number" step="0.01" value={formData.commission_percent} onChange={e => setFormData({...formData, commission_percent: e.target.value})} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label className="text-base">E-mail (Opcional)</Label>
                <Input className="h-11 text-base" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Telefone (Opcional)</Label>
                <Input className="h-11 text-base" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Dados para Pagamento (Opcional)</Label>
                <Input className="h-11 text-base" value={formData.payment_data} onChange={e => setFormData({...formData, payment_data: e.target.value})} disabled={loading} placeholder="Ex: Chave PIX, Conta Bancária" />
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={loading} className="w-full h-11 text-base">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Atualizar' : 'Adicionar')}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={loading} className="h-11 text-base">
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="md:col-span-2">
            <h3 className="font-semibold mb-4">Parceiros Cadastrados</h3>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-base">Nome</TableHead>
                    <TableHead className="text-base">Comissão (%)</TableHead>
                    <TableHead className="text-base">Contato</TableHead>
                    <TableHead className="text-right text-base">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-base">Nenhum parceiro cadastrado.</TableCell>
                    </TableRow>
                  ) : (
                    partners.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-base">{p.name}</TableCell>
                        <TableCell className="text-base">{p.commission_percent}%</TableCell>
                        <TableCell className="text-sm sm:text-base">
                          {p.email && <div>{p.email}</div>}
                          {p.phone && <div>{p.phone}</div>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} className="h-9 w-9">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 h-9 w-9" onClick={() => handleDelete(p.id)}>
                            <Trash className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
