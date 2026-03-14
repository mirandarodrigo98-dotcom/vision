'use client';

import { useEffect, useRef } from 'react';
import { getUnreadNotifications, markNotificationAsRead } from '@/app/actions/notifications';
import { toast } from 'sonner';

export function NotificationMonitor() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Request permission on mount
    const requestPermission = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    };

    requestPermission();

    // Also try on first click if permission is default (browsers block auto request)
    const handleInteraction = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      // Remove listener after first interaction
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    // Initialize audio
    audioRef.current = new Audio('/sounds/notification.mp3'); 
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const notifications = await getUnreadNotifications();
        
        if (notifications.length > 0) {
          // Play sound if possible
          if (audioRef.current) {
            audioRef.current.play().catch(() => {}); // Ignore autoplay errors
          }

          for (const notification of notifications) {
            // Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              const n = new Notification(notification.title, {
                body: notification.message,
                icon: '/icons/icon-192x192.png', // Adjust path as needed
                tag: notification.id // Prevent duplicates
              });
              
              n.onclick = () => {
                window.focus();
                if (notification.link) {
                  window.location.href = notification.link;
                }
                n.close();
              };
            }

            // Toast Notification (fallback/additional)
            toast(notification.title, {
              description: notification.message,
              action: notification.link ? {
                label: 'Ver',
                onClick: () => window.location.href = notification.link!
              } : undefined,
            });

            // Mark as read immediately after showing
            await markNotificationAsRead(notification.id);
          }
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    // Initial check
    checkNotifications();

    // Poll every 30 seconds
    const interval = setInterval(checkNotifications, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null; // This component is invisible
}
