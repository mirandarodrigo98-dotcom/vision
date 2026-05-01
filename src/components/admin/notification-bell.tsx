'use client';

import { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  getUnreadNotifications, 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  NotificationItem 
} from '@/app/actions/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Polling for unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const unread = await getUnreadNotifications();
      setUnreadCount(unread.length);
      
      // If popover is open, refresh the list to show new ones
      if (isOpen) {
        try {
          const { notifications: newNotifs } = await getUserNotifications(20, 0);
          setNotifications(newNotifs);
        } catch (e) {
          // ignore
        }
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { notifications } = await getUserNotifications(20, 0);
      setNotifications(notifications);
      // Update unread count based on loaded notifications just in case
      const unread = notifications.filter(n => !n.read).length;
      // We don't setUnreadCount here to avoid flickering if global count is different, 
      // but strictly speaking we should trust the server.
      // Let's stick to the poller for the badge count.
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, link: string | null) => {
    try {
      await markNotificationAsRead(id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      if (link) {
        setIsOpen(false);
        router.push(link);
      }
    } catch (error) {
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error) {
      toast.error('Erro ao marcar todas como lidas');
    }
  };

  const handleRequestPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          toast.success('Notificações ativadas!');
        } else {
          toast.error('Permissão negada.');
        }
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          type="button" 
          className="relative rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <span className="sr-only">Ver notificações</span>
          <BellIcon className="h-6 w-6" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white ring-2 ring-white shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex flex-col items-center justify-center border-b p-3 relative">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleMarkAllAsRead();
              }}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1 hover:underline focus:outline-none"
            >
              Marcar todas como lidas
            </button>
          )}
          {/* Permission Request Button (only if needed/supported) */}
          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
            <Button 
              variant="ghost" 
              size="xs" 
              className="text-[10px] h-6 px-2 absolute right-2 top-2"
              onClick={handleRequestPermission}
            >
              Ativar
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
              <BellIcon className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`
                    relative p-4 text-sm hover:bg-muted/50 transition-colors 
                    ${!notification.read ? 'bg-blue-50/50' : ''}
                  `}
                >
                  <div className="flex gap-3">
                    <div 
                      className="flex-1 space-y-1 cursor-pointer"
                      onClick={() => handleMarkAsRead(notification.id, notification.link)}
                    >
                      <p className={`font-medium leading-none ${!notification.read ? 'text-primary' : 'text-foreground'}`}>
                        {notification.title}
                      </p>
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground pt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <span className="flex h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-blue-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id, null);
                          }}
                          title="Marcar como lida"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-2 text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs h-8" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
