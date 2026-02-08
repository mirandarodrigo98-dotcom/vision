'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { requestOtp, verifyOtp, loginClient, checkUserType } from '@/app/actions/auth';
import { APP_VERSION } from '@/lib/version';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  
  // Steps: 'login' (email+password) -> 'otp'
  const [step, setStep] = useState<'login' | 'otp'>('login');
  
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Restore state logic (simplified for unification)
  useEffect(() => {
    const storedEmail = localStorage.getItem('login_email');
    const storedStep = localStorage.getItem('login_step');
    const storedTime = localStorage.getItem('login_time');

    if (storedEmail && storedStep && storedTime) {
        const elapsed = Date.now() - parseInt(storedTime, 10);
        if (elapsed < 10 * 60 * 1000) { // 10 minutes
            setEmail(storedEmail);
            // If stored step was OTP, restore it. Otherwise default to login.
            if (storedStep === 'otp') {
                setStep('otp');
                const secondsPassed = Math.floor(elapsed / 1000);
                if (secondsPassed < 60) {
                    setTimeLeft(60 - secondsPassed);
                } else {
                    setTimeLeft(0);
                }
            }
        } else {
            clearStorage();
        }
    }
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const clearStorage = () => {
      localStorage.removeItem('login_email');
      localStorage.removeItem('login_step');
      localStorage.removeItem('login_time');
      localStorage.removeItem('login_type');
  };

  const persistState = (currentEmail: string, newStep: string, type?: string) => {
      localStorage.setItem('login_email', currentEmail);
      localStorage.setItem('login_step', newStep);
      localStorage.setItem('login_time', Date.now().toString());
      if (type) localStorage.setItem('login_type', type);
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
        toast.error('Por favor, digite seu e-mail.');
        return;
    }

    setLoading(true);
    try {
        // 1. Check user type first
        const check = await checkUserType(cleanEmail);
        
        if (check.authMethod === 'password') {
            // 2. If password user, try to login directly
            if (!password) {
                toast.error('Por favor, digite sua senha.');
                setLoading(false);
                return;
            }

            const res = await loginClient(cleanEmail, password);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success('Login realizado com sucesso!');
                clearStorage();
                
                if (res.mustChangePassword) {
                    window.location.replace('/change-password');
                } else {
                    window.location.replace('/'); 
                }
            }
        } else if (check.authMethod === 'otp') {
             // 3. If OTP user, send code and switch to OTP step
            const res = await requestOtp(cleanEmail);
            if (res.error) {
                toast.error(res.error);
            } else {
                setStep('otp');
                setTimeLeft(60);
                persistState(cleanEmail, 'otp', check.type);
                toast.success('Código de acesso enviado para seu e-mail.');
            }
        } else {
            // Not found
            toast.error('E-mail não encontrado no sistema.');
        }
    } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        toast.error(`Erro ao realizar login: ${message}`);
    } finally {
        setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();
    try {
      const res = await verifyOtp(cleanEmail, otp);
      if (res.error) {
        toast.error(res.error);
        setLoading(false);
      } else {
        toast.success('Login realizado com sucesso!');
        clearStorage();
        // Force redirect using window.location.replace to prevent back button loop
        window.location.replace('/'); 
      }
    } catch {
      toast.error('Erro ao verificar código.');
      setLoading(false);
    }
  }

  async function handleResendOtp() {
      setLoading(true);
      const cleanEmail = email.toLowerCase().trim();
      try {
          const res = await requestOtp(cleanEmail);
          if (res.error) {
              toast.error(res.error);
          } else {
              setTimeLeft(60);
              toast.success('Novo código enviado.');
          }
      } catch {
          toast.error('Erro ao reenviar código.');
      } finally {
          setLoading(false);
      }
  }

  const handleBack = () => {
      setStep('login');
      setOtp('');
      setPassword('');
      clearStorage();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start pt-10 sm:pt-16 bg-gray-50 p-4">
      <div className="mb-8 text-center flex flex-col items-center">
        <img 
            src="/logo.png?v=2" 
            alt="Vision Logo" 
            className="mb-6 h-32 w-auto object-contain"
        />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
              {step === 'login' && 'Acesse sua conta'}
              {step === 'otp' && 'Código de Verificação'}
          </CardTitle>
          <CardDescription>
              {step === 'login' && 'Digite suas credenciais para continuar'}
              {step === 'otp' && `Enviamos um código para ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">E-mail</label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="seu@email.com.br"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Senha</label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="********"
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Entrar' : 'Entrar'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="otp" className="text-sm font-medium">Código</label>
                  <Input 
                    id="otp" 
                    type="text" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    required 
                    placeholder="123456"
                    disabled={loading}
                    autoFocus
                    className="text-center text-2xl tracking-widest"
                    maxLength={6}
                  />
                </div>
                
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar no Sistema'}
                </Button>
              </form>

              <div className="border-t pt-4 space-y-3">
                <div className="text-center text-sm text-gray-500">
                  {timeLeft > 0 ? (
                    <p>Reenviar código em {timeLeft}s</p>
                  ) : (
                    <p>Não recebeu o código?</p>
                  )}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleResendOtp}
                  disabled={loading || timeLeft > 0}
                >
                  Reenviar Código
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-sm" 
                  onClick={handleBack}
                  disabled={loading}
                >
                  Voltar / Trocar e-mail
                </Button>
              </div>
            </div>
          )}

          {step === 'password' && (
             <div className="space-y-4">
                <form onSubmit={handleLoginPassword} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium">Senha</label>
                        <Input 
                            id="password" 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            disabled={loading}
                            autoFocus
                        />
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>
                <div className="border-t pt-4">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        className="w-full text-sm" 
                        onClick={handleBack}
                        disabled={loading}
                    >
                        Voltar / Trocar e-mail
                    </Button>
                </div>
             </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-xs text-gray-400 font-mono">
        v{APP_VERSION}
      </div>
    </div>
  );
}