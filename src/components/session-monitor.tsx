'use client';

import { useEffect, useState } from 'react';
import { checkCurrentSessionAccess } from '@/app/actions/schedules';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/actions/auth';

export function SessionMonitor() {
  const router = useRouter();
  const [nextLogout, setNextLogout] = useState<Date | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const result = await checkCurrentSessionAccess();
        
        if (!result.allowed) {
          toast.error('Seu horário de acesso expirou. Você será desconectado.');
          await logout();
          router.push('/login');
          return;
        }

        if (result.nextLogout) {
          setNextLogout(new Date(result.nextLogout));
        }
      } catch (error) {
        console.error('Error checking session access:', error);
      }
    };

    // Check immediately
    checkAccess();

    // Check every minute
    const interval = setInterval(checkAccess, 60000);

    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (!nextLogout) return;

    const checkLogout = () => {
      const now = new Date();
      const timeLeft = nextLogout.getTime() - now.getTime();
      
      // 5 minutes warning
      if (timeLeft > 0 && timeLeft <= 5 * 60 * 1000 && timeLeft > 4 * 60 * 1000) {
        toast.warning('Seu turno encerrará em 5 minutos.');
      }

      // Logout time reached
      if (timeLeft <= 0) {
        toast.error('Seu turno encerrou.');
        logout().then(() => router.push('/login'));
      }
    };

    const interval = setInterval(checkLogout, 10000); // Check every 10 seconds locally
    return () => clearInterval(interval);
  }, [nextLogout, router]);

  return null;
}