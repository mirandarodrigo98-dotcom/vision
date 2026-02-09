'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSettings } from '@/app/actions/settings';
import { uploadSystemLogo, removeSystemLogo } from '@/app/actions/upload-logo';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';

interface SettingsFormProps {
    initialData: {
        email: string;
        logoUrl?: string | null;
    }
}

export function SettingsForm({ initialData }: SettingsFormProps) {
    const [nzdEmail, setNzdEmail] = useState(initialData.email);
    const [loading, setLoading] = useState(false);
    
    // Logo state
    const [logoUrl, setLogoUrl] = useState<string | null>(initialData.logoUrl || null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const settingsToUpdate = [
                { key: 'NZD_DEST_EMAIL', value: nzdEmail }
            ];

            const result = await updateSettings(settingsToUpdate);
            
            if (result.success) {
                toast.success('Configurações salvas com sucesso');
            } else {
                toast.error('Erro ao salvar: ' + result.error);
            }
        } catch (error) {
            toast.error('Erro inesperado');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1024 * 1024) {
            toast.error('A logo deve ter no máximo 1MB.');
            return;
        }

        setUploadingLogo(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const result = await uploadSystemLogo(formData);
            if (result.success && result.path) {
                setLogoUrl(result.path);
                toast.success('Logo atualizada com sucesso');
            } else {
                toast.error(result.error || 'Erro ao fazer upload da logo');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao fazer upload da logo');
        } finally {
            setUploadingLogo(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveLogo = async () => {
        if (!confirm('Tem certeza que deseja remover a logo personalizada?')) return;
        
        setUploadingLogo(true);
        try {
            const result = await removeSystemLogo();
            if (result.success) {
                setLogoUrl(null);
                toast.success('Logo removida com sucesso');
            } else {
                toast.error(result.error || 'Erro ao remover logo');
            }
        } catch (error) {
             console.error(error);
            toast.error('Erro ao remover logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-8">
            {/* Seção Geral */}
            <section className="border p-6 rounded-md bg-white space-y-4">
                <div className="border-b pb-2 mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Geral</h3>
                    <p className="text-sm text-gray-500">Configurações gerais do sistema e identidade visual.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label className="block mb-2">Logo do Sistema (300x300px, máx 1MB)</Label>
                        <div className="flex items-start gap-6">
                            <div className="relative border rounded-lg p-2 bg-gray-50 w-[150px] h-[150px] flex items-center justify-center overflow-hidden">
                                <img 
                                    src={logoUrl || "/logo.png?v=2"} 
                                    alt="Logo do Sistema" 
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleLogoUpload}
                                        disabled={uploadingLogo}
                                    />
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingLogo}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        {uploadingLogo ? 'Enviando...' : 'Carregar Nova Logo'}
                                    </Button>
                                </div>
                                
                                {logoUrl && (
                                    <div>
                                        <Button 
                                            type="button" 
                                            variant="destructive" 
                                            size="sm"
                                            onClick={handleRemoveLogo}
                                            disabled={uploadingLogo}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Remover Logo
                                        </Button>
                                    </div>
                                )}
                                
                                <p className="text-xs text-gray-500 max-w-xs">
                                    A logo será exibida na tela de login, cabeçalho de e-mails e relatórios PDF.
                                    Se não for incluída, será usada a logo padrão.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Seção Departamento Pessoal */}
            <form onSubmit={handleSubmit}>
                <section className="border p-6 rounded-md bg-white space-y-4 mb-6">
                    <div className="border-b pb-2 mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Departamento Pessoal</h3>
                        <p className="text-sm text-gray-500">Configurações específicas do módulo de Departamento Pessoal.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nzd-email">E-mail Pessoal</Label>
                        <Input 
                            id="nzd-email" 
                            type="email" 
                            placeholder="ex: admissoes@nzdcontabilidade.com.br"
                            value={nzdEmail}
                            onChange={(e) => setNzdEmail(e.target.value)}
                            required
                        />
                        <p className="text-xs text-gray-500">Este é o e-mail que receberá as notificações do Pessoal.</p>
                    </div>
                </section>

                <div className="flex justify-end">
                    <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                        {loading ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
