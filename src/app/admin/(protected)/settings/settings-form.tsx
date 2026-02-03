'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSettings } from '@/app/actions/settings';
import { toast } from 'sonner';
import RichTextEditor from '@/components/ui/rich-text-editor';

interface SettingsFormProps {
    initialData: {
        email: string;
        subject: string;
        body: string;
    }
}

export function SettingsForm({ initialData }: SettingsFormProps) {
    const [nzdEmail, setNzdEmail] = useState(initialData.email);
    const [subject, setSubject] = useState(initialData.subject);
    const [body, setBody] = useState(initialData.body);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const settingsToUpdate = [
                { key: 'NZD_DEST_EMAIL', value: nzdEmail },
                { key: 'EMAIL_SUBJECT', value: subject },
                { key: 'EMAIL_BODY', value: body }
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

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 border p-6 rounded-md bg-white">
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

            <div className="space-y-2">
                <Label htmlFor="email-subject">Assunto</Label>
                <Input 
                    id="email-subject" 
                    type="text" 
                    placeholder="ex: Nova Admissão Recebida"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                />
                <p className="text-xs text-gray-500">Aqui o admin vai colocar o assunto que irá no e-mail quando a admissão for enviada.</p>
            </div>

            <div className="space-y-2">
                <Label>Conteúdo do E-mail</Label>
                <div className="mb-4">
                    <RichTextEditor 
                        value={body} 
                        onChange={setBody}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2">O texto que estiver aqui vai no corpo do e-mail a ser enviado.</p>
            </div>

            <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
            </div>
        </form>
    );
}
