
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { updatePassword } from '@/app/actions/auth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (password.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres.');
        return;
    }

    if (password !== confirmPassword) {
        toast.error('As senhas não coincidem.');
        return;
    }

    setLoading(true);
    try {
        const res = await updatePassword(password);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success('Senha alterada com sucesso!');
            router.push('/');
        }
    } catch (err: any) {
        console.error('Update password error:', err);
        toast.error('Erro ao atualizar senha: ' + (err.message || String(err)));
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start pt-10 sm:pt-16 bg-gray-50 p-4">
      <div className="mb-8 text-center flex flex-col items-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">VISION</h1>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Definir Nova Senha</CardTitle>
          <CardDescription>
            Por segurança, você precisa definir uma nova senha para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Nova Senha</label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => {
                  e.target.setCustomValidity('');
                  setPassword(e.target.value);
                }} 
                onInvalid={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.validity.tooShort) {
                    target.setCustomValidity('A senha deve ter no mínimo 6 caracteres.');
                  }
                }}
                required 
                placeholder="********"
                disabled={loading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Nova Senha</label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => {
                  e.target.setCustomValidity('');
                  setConfirmPassword(e.target.value);
                }} 
                onInvalid={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.validity.tooShort) {
                    target.setCustomValidity('A senha deve ter no mínimo 6 caracteres.');
                  }
                }}
                required 
                placeholder="********"
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Atualizando...' : 'Definir Senha e Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
