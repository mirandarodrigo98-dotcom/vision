
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Trash2 } from 'lucide-react';
import { searchSocios } from '@/app/actions/societario';
import { toast } from 'sonner';

interface Socio {
  id: string; // UUID from DB
  cpf: string;
  nome: string;
  data_nascimento?: string;
  rg?: string;
  cnh?: string;
  cep?: string;
  logradouro_tipo?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
}

interface CompanySocioForm {
  id: number; // ID temporário para lista local
  socioId?: string; // ID real do sócio se já existir
  nome: string;
  cpf: string;
  participacao: number;
  is_representative: boolean;
  data_nascimento?: Date;
  rg?: string;
  cnh?: string;
  cep?: string;
  logradouro_tipo?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
}

interface LegalRepresentativeTabProps {
  socios: CompanySocioForm[];
  setSocios: React.Dispatch<React.SetStateAction<CompanySocioForm[]>>;
  totalParticipacao: number;
}

export function LegalRepresentativeTab({ socios, setSocios, totalParticipacao }: LegalRepresentativeTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Socio[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [participacaoInput, setParticipacaoInput] = useState('');

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchSocios(searchTerm);
      setSearchResults(results);
    } catch (error) {
      toast.error('Erro ao buscar sócios');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSocio = (socio: Socio) => {
    setSelectedSocio(socio);
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleAddSocio = () => {
    if (!selectedSocio) {
      // Se não selecionou da busca, verifica se preencheu manualmente (caso queira permitir novo cadastro inline - mas o requisito diz "trazer essa informação do cadastro de sócio")
      // O requisito diz "através de um seletor de dados... à medida em que ele selecionar esse sócio vai ficar em uma lista".
      // Então vou forçar a seleção.
      toast.error('Selecione um sócio da busca.');
      return;
    }

    // Verifica se já está na lista
    if (socios.some(s => s.cpf === selectedSocio.cpf)) {
      toast.error('Sócio já adicionado.');
      return;
    }

    const participacao = parseFloat(participacaoInput.replace(',', '.'));
    if (isNaN(participacao) || participacao <= 0) {
      toast.error('Informe uma participação válida.');
      return;
    }

    if (totalParticipacao + participacao > 100) {
      toast.error('Total de participação excede 100%.');
      return;
    }

    setSocios(prev => [
      ...prev,
      {
        id: Date.now(), // ID temporário
        socioId: selectedSocio.id,
        nome: selectedSocio.nome,
        cpf: selectedSocio.cpf,
        participacao: participacao,
        is_representative: false, // Default false
        data_nascimento: selectedSocio.data_nascimento ? new Date(selectedSocio.data_nascimento + 'T12:00:00') : undefined,
        rg: selectedSocio.rg || '',
        cnh: selectedSocio.cnh || '',
        cep: selectedSocio.cep || '',
        logradouro_tipo: selectedSocio.logradouro_tipo || '',
        logradouro: selectedSocio.logradouro || '',
        numero: selectedSocio.numero || '',
        complemento: selectedSocio.complemento || '',
        bairro: selectedSocio.bairro || '',
        municipio: selectedSocio.municipio || '',
        uf: selectedSocio.uf || ''
      }
    ]);

    setSelectedSocio(null);
    setParticipacaoInput('');
  };

  const handleRemoveSocio = (id: number) => {
    setSocios(prev => prev.filter(s => s.id !== id));
  };

  const handleSetRepresentative = (id: number) => {
    setSocios(prev => prev.map(s => ({
      ...s,
      is_representative: s.id === id // Apenas este será true, outros false (checkbox behave like radio but UI is checkbox)
    })));
  };

  // Se o usuário clicar no checkbox novamente para desmarcar, permitimos?
  // O requisito diz "somente um sócio poderá ser selecionado".
  // Vou permitir desmarcar clicando no mesmo.
  const handleToggleRepresentative = (id: number, checked: boolean) => {
    if (checked) {
       handleSetRepresentative(id);
    } else {
       // Desmarcar
       setSocios(prev => prev.map(s => s.id === id ? { ...s, is_representative: false } : s));
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4 border p-4 rounded-md bg-muted/20">
        <h3 className="font-medium">Adicionar Sócio</h3>
        <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Buscar Sócio (Nome ou CPF)</label>
                <div className="relative">
                    <Input 
                        value={selectedSocio ? `${selectedSocio.nome} (${selectedSocio.cpf})` : searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setSelectedSocio(null); // Limpa seleção ao digitar
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                        placeholder="Digite para buscar..."
                    />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="absolute right-0 top-0 h-full"
                        onClick={handleSearch}
                        disabled={isSearching}
                    >
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                {/* Resultados da busca */}
                {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full max-w-md bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                        {searchResults.map(result => (
                            <div 
                                key={result.id} 
                                className="p-2 hover:bg-muted cursor-pointer text-sm"
                                onClick={() => handleSelectSocio(result)}
                            >
                                <p className="font-medium">{result.nome}</p>
                                <p className="text-xs text-muted-foreground">{result.cpf}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-[150px] space-y-2">
                <label className="text-sm font-medium">Participação %</label>
                <Input 
                    type="number" 
                    value={participacaoInput} 
                    onChange={(e) => setParticipacaoInput(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max="100"
                />
            </div>

            <Button type="button" onClick={handleAddSocio} disabled={!selectedSocio || !participacaoInput}>
                Adicionar
            </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
            <h3 className="font-medium">Sócios Vinculados</h3>
            <span className={`text-sm font-medium ${totalParticipacao !== 100 ? 'text-red-500' : 'text-green-600'}`}>
                Total: {totalParticipacao.toFixed(2)}%
            </span>
        </div>

        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>CPF</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Participação %</TableHead>
                    <TableHead className="text-center">Representante Legal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {socios.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhum sócio vinculado.
                        </TableCell>
                    </TableRow>
                ) : (
                    socios.map((socio) => (
                        <TableRow key={socio.id}>
                            <TableCell>{socio.cpf}</TableCell>
                            <TableCell>{socio.nome}</TableCell>
                            <TableCell>{Number(socio.participacao).toFixed(2)}%</TableCell>
                            <TableCell className="text-center">
                                <Checkbox 
                                    checked={socio.is_representative}
                                    onCheckedChange={(checked) => handleToggleRepresentative(socio.id, checked === true)}
                                />
                            </TableCell>
                            <TableCell>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => handleRemoveSocio(socio.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </div>

      {/* Hidden inputs para enviar no formulário */}
      {socios.map((socio, index) => (
        <div key={socio.id} className="hidden">
            <input name={`socio[${index}][nome]`} value={socio.nome} readOnly />
            <input name={`socio[${index}][cpf]`} value={socio.cpf} readOnly />
            <input name={`socio[${index}][participacao_percent]`} value={socio.participacao} readOnly />
            <input name={`socio[${index}][is_representative]`} value={socio.is_representative ? 'true' : 'false'} readOnly />
            <input name={`socio[${index}][rg]`} value={socio.rg || ''} readOnly />
            <input name={`socio[${index}][cnh]`} value={socio.cnh || ''} readOnly />
            <input name={`socio[${index}][cep]`} value={socio.cep || ''} readOnly />
            <input name={`socio[${index}][logradouro_tipo]`} value={socio.logradouro_tipo || ''} readOnly />
            <input name={`socio[${index}][logradouro]`} value={socio.logradouro || ''} readOnly />
            <input name={`socio[${index}][numero]`} value={socio.numero || ''} readOnly />
            <input name={`socio[${index}][complemento]`} value={socio.complemento || ''} readOnly />
            <input name={`socio[${index}][bairro]`} value={socio.bairro || ''} readOnly />
            <input name={`socio[${index}][municipio]`} value={socio.municipio || ''} readOnly />
            <input name={`socio[${index}][uf]`} value={socio.uf || ''} readOnly />
            {socio.data_nascimento && <input name={`socio[${index}][data_nascimento]`} value={socio.data_nascimento.toISOString().split('T')[0]} readOnly />}
        </div>
      ))}
    </div>
  );
}
