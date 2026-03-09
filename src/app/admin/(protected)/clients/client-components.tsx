'use client';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toggleCompanyStatus, deleteCompany } from '@/app/actions/companies';
import { toast } from 'sonner';
import { Pencil, Power, PowerOff, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ColumnHeader } from '@/components/ui/column-header';

interface Company {
  id: string;
  nome: string;
  razao_social: string;
  cnpj: string;
  code: string | null;
  filial: string | null;
  municipio: string | null;
  uf: string | null;
  data_abertura: string | null;
  telefone: string;
  email_contato: string;
  is_active: number;
  has_movements: number;
}

export function CompanyList({ companies }: { companies: Company[] }) {
  return (
    <div className="space-y-4">
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <ColumnHeader column="code" title="Código" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="razao_social" title="Razão Social" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="cnpj" title="CNPJ" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="email_contato" title="Email" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="is_active" title="Status" />
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.code || '-'}</TableCell>
                <TableCell className="font-medium">{company.razao_social}</TableCell>
                <TableCell>{company.cnpj}</TableCell>
                <TableCell>{company.email_contato}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {company.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/admin/clients/${company.id}/edit`}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-primary border-primary/20 hover:bg-primary/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Editar</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {company.has_movements === 1 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="inline-block">
                            <Button 
                                variant="ghost" 
                                size="icon"
                                disabled
                                className="opacity-50 cursor-not-allowed"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Empresa possui movimentações e não pode ser excluída</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                     <AlertDialog>
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <AlertDialogTrigger asChild>
                               <Button 
                                   variant="ghost" 
                                   size="icon"
                                   className="text-red-500 hover:text-red-700 hover:bg-red-50"
                               >
                                   <Trash2 className="h-4 w-4" />
                               </Button>
                             </AlertDialogTrigger>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>Excluir</p>
                           </TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                       <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Empresa</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a empresa <strong>{company.razao_social}</strong>?
                            <br/><br/>
                            Esta ação não pode ser desfeita e removerá permanentemente os dados da empresa.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={async () => {
                              const res = await deleteCompany(company.id);
                              if (res.error) {
                                toast.error(res.error);
                              } else {
                                toast.success('Empresa excluída com sucesso');
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  <form action={async () => {
                     await toggleCompanyStatus(company.id, !company.is_active);
                     toast.success('Status atualizado');
                  }} className="inline-block">
                    <Button variant="ghost" size="icon" type="submit" title={company.is_active ? "Desativar" : "Ativar"}>
                      {company.is_active ? <PowerOff className="h-4 w-4 text-red-500" /> : <Power className="h-4 w-4 text-green-500" />}
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Nenhuma empresa cadastrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
