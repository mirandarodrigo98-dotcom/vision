'use client';

import { useEffect, useRef } from 'react';
import { getUnreadNotifications } from '@/app/actions/notifications';
import { toast } from 'sonner';

export function NotificationMonitor() {
  const lastCountRef = useRef(0);
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Solicitar permissão ao carregar
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkNotifications = async () => {
      try {
        const unread = await getUnreadNotifications();
        const currentCount = unread.length;

        // Se não for a primeira execução e tivermos mais notificações do que antes
        if (!isFirstRun.current && currentCount > lastCountRef.current) {
          // Encontrar as novas notificações
          // Simplificação: Pegar as (currentCount - lastCountRef.current) mais recentes
          const newNotificationsCount = currentCount - lastCountRef.current;
          const newNotifications = unread.slice(0, newNotificationsCount);

          newNotifications.forEach(notification => {
            // Disparar notificação do sistema
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/icon.png' // Ajustar caminho do ícone se necessário
              });
            }
            
            // Disparar toast também
            toast.info(notification.title, {
              description: notification.message,
            });
          });
        }

        lastCountRef.current = currentCount;
        isFirstRun.current = false;
      } catch (error) {
        console.error('Erro ao verificar notificações:', error);
      }
    };

    // Verificar imediatamente
    checkNotifications();

    // Polling a cada 30 segundos
    const interval = setInterval(checkNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  return null; // Componente sem UI visual
}
