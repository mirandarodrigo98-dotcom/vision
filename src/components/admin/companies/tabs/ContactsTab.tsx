
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Phone, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCompanyPhones, getCompanyEmails, saveCompanyPhone, saveCompanyEmail, deleteCompanyPhone, deleteCompanyEmail, getContactCategories, createContactCategory } from '@/app/actions/contacts';

interface ContactsTabProps {
  companyId?: string;
}

export function ContactsTab({ companyId }: ContactsTabProps) {
  const [phones, setPhones] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form states
  const [phoneForm, setPhoneForm] = useState({ name: '', category_id: '', number: '', is_whatsapp: false });
  const [emailForm, setEmailForm] = useState({ name: '', category_id: '', email: '' });

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, e, c] = await Promise.all([
        getCompanyPhones(companyId!),
        getCompanyEmails(companyId!),
        getContactCategories()
      ]);
      setPhones(p);
      setEmails(e);
      setCategories(c);
    } catch (err) {
      toast.error('Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const res = await createContactCategory(newCategoryName);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Categoria criada!');
      setNewCategoryName('');
      setIsCategoryOpen(false);
      const cats = await getContactCategories();
      setCategories(cats);
    }
  };

  const handleSavePhone = async () => {
    if (!companyId) return;
    if (!phoneForm.category_id) {
        toast.error('Selecione uma categoria');
        return;
    }
    const res = await saveCompanyPhone({ ...phoneForm, company_id: companyId, category_id: Number(phoneForm.category_id) });
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Telefone salvo!');
      setIsPhoneOpen(false);
      setPhoneForm({ name: '', category_id: '', number: '', is_whatsapp: false });
      const p = await getCompanyPhones(companyId);
      setPhones(p);
    }
  };

  const handleSaveEmail = async () => {
    if (!companyId) return;
    if (!emailForm.category_id) {
        toast.error('Selecione uma categoria');
        return;
    }
    const res = await saveCompanyEmail({ ...emailForm, company_id: companyId, category_id: Number(emailForm.category_id) });
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('E-mail salvo!');
      setIsEmailOpen(false);
      setEmailForm({ name: '', category_id: '', email: '' });
      const e = await getCompanyEmails(companyId);
      setEmails(e);
    }
  };

  const handleDeletePhone = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    const res = await deleteCompanyPhone(id);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Telefone excluído');
      setPhones(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    const res = await deleteCompanyEmail(id);
    if (res.error) toast.error(res.error);
    else {
      toast.success('E-mail excluído');
      setEmails(prev => prev.filter(e => e.id !== id));
    }
  };

  if (!companyId) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Salve a empresa primeiro para adicionar contatos.
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 py-4">
      {/* Telefones */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium flex items-center gap-2"><Phone className="h-4 w-4" /> Telefones</h3>
            <Button type="button" onClick={() => setIsPhoneOpen(true)} size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4" /> Telefone
            </Button>
        </div>
        
        <div className="border rounded-md">
            <Table>
                <TableBody>
                    {phones.length === 0 ? (
                        <TableRow>
                            <TableCell className="text-center text-muted-foreground">Nenhum telefone cadastrado.</TableCell>
                        </TableRow>
                    ) : (
                        phones.map(phone => (
                            <TableRow key={phone.id}>
                                <TableCell className="font-medium text-primary">{phone.name}</TableCell>
                                <TableCell>{phone.number}</TableCell>
                                <TableCell>
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">{phone.category_name}</span>
                                    {phone.is_whatsapp && <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">WhatsApp</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleDeletePhone(phone.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

      {/* Emails */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> E-mails</h3>
            <Button type="button" onClick={() => setIsEmailOpen(true)} size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4" /> E-mail
            </Button>
        </div>
        
        <div className="border rounded-md">
            <Table>
                <TableBody>
                    {emails.length === 0 ? (
                        <TableRow>
                            <TableCell className="text-center text-muted-foreground">Nenhum e-mail cadastrado.</TableCell>
                        </TableRow>
                    ) : (
                        emails.map(email => (
                            <TableRow key={email.id}>
                                <TableCell className="font-medium text-primary">{email.name}</TableCell>
                                <TableCell>{email.email}</TableCell>
                                <TableCell>
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">{email.category_name}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteEmail(email.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

      {/* Modal Telefone */}
      <Dialog open={isPhoneOpen} onOpenChange={setIsPhoneOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Telefone</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nome</label>
                    <Input placeholder="Nome" value={phoneForm.name} onChange={e => setPhoneForm({...phoneForm, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Categoria</label>
                    <div className="flex gap-2">
                        <Select value={phoneForm.category_id} onValueChange={v => setPhoneForm({...phoneForm, category_id: v})}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Sem categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button type="button" size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => setIsCategoryOpen(true)}>+ Categoria</Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Número</label>
                    <Input placeholder="+55 (xx) xxxxx-xxxx" value={phoneForm.number} onChange={e => setPhoneForm({...phoneForm, number: e.target.value})} />
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="whatsapp" checked={phoneForm.is_whatsapp} onCheckedChange={(c) => setPhoneForm({...phoneForm, is_whatsapp: c === true})} />
                    <label htmlFor="whatsapp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Esse contato é um grupo no WhatsApp
                    </label>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPhoneOpen(false)}>Fechar</Button>
                <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={handleSavePhone}>Salvar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Email */}
      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar E-mail</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nome</label>
                    <Input placeholder="Nome" value={emailForm.name} onChange={e => setEmailForm({...emailForm, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Categoria</label>
                    <div className="flex gap-2">
                        <Select value={emailForm.category_id} onValueChange={v => setEmailForm({...emailForm, category_id: v})}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Sem categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button type="button" size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => setIsCategoryOpen(true)}>+ Categoria</Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">E-mail</label>
                    <Input placeholder="Email" value={emailForm.email} onChange={e => setEmailForm({...emailForm, email: e.target.value})} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEmailOpen(false)}>Fechar</Button>
                <Button type="button" className="bg-teal-600 hover:bg-teal-700" onClick={handleSaveEmail}>Salvar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Categoria */}
      <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Nova Categoria</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="name" className="text-right text-sm">Nome</label>
                    <Input id="name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" onClick={handleCreateCategory}>Criar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
