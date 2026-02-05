'use client';

import { useState } from 'react';
import { updateProfile } from '@/app/actions/profile';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface ProfileFormProps {
    user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        avatar_path: string | null;
    };
}

export default function ProfileForm({ user }: ProfileFormProps) {
    const [isPending, setIsPending] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatar_path);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        try {
            const result = await updateProfile(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Perfil atualizado com sucesso!');
                const form = document.getElementById('profile-form') as HTMLFormElement;
                if (form) {
                   const passwordInputs = form.querySelectorAll('input[type="password"]');
                   passwordInputs.forEach((input) => (input as HTMLInputElement).value = '');
                }
            }
        } catch (error) {
            toast.error('Ocorreu um erro inesperado.');
        } finally {
            setIsPending(false);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    return (
        <form id="profile-form" action={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center mb-6">
                <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                        <AvatarImage src={previewUrl || ''} className="object-cover" />
                        <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <label 
                        htmlFor="avatar-upload" 
                        className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-white cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
                        title="Alterar foto"
                    >
                        <Camera size={20} />
                        <input 
                            id="avatar-upload" 
                            name="avatar" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                    </label>
                </div>
                <p className="mt-2 text-sm text-gray-500">Clique no ícone da câmera para alterar sua foto</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input 
                        id="name" 
                        name="name" 
                        defaultValue={user.name} 
                        required 
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        defaultValue={user.email} 
                        required 
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input 
                        id="phone" 
                        name="phone" 
                        defaultValue={user.phone || ''} 
                    />
                </div>
            </div>

            <div className="border-t pt-6 mt-6">
                <h2 className="text-lg font-semibold mb-4">Alterar Senha</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Deixe os campos em branco se não quiser alterar sua senha.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="current_password">Senha Atual</Label>
                        <Input 
                            id="current_password" 
                            name="current_password" 
                            type="password" 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="new_password">Nova Senha</Label>
                        <Input 
                            id="new_password" 
                            name="new_password" 
                            type="password" 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                        <Input 
                            id="confirm_password" 
                            name="confirm_password" 
                            type="password" 
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>
        </form>
    );
}