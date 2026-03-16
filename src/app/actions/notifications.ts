'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  type?: string;
}

export async function getUnreadNotifications() {
  const session = await getSession();
  if (!session) return [];

  try {
    const notifications = await db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? AND read = 0 
      ORDER BY created_at DESC
    `).all(session.user_id);
    
    // Converter boolean integer para boolean real
    return notifications.map((n: any) => ({
      ...n,
      read: Boolean(n.read)
    })) as Notification[];
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
}

export async function getUserNotifications(limit = 20, offset = 0) {
  const session = await getSession();
  if (!session) return { notifications: [], total: 0 };

  try {
    const notifications = await db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(session.user_id, limit, offset);

    const total = await db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ?
    `).get(session.user_id) as { count: number };
    
    return {
      notifications: notifications.map((n: any) => ({
        ...n,
        read: Boolean(n.read)
      })) as Notification[],
      total: total.count
    };
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return { notifications: [], total: 0 };
  }
}

export async function markNotificationAsRead(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(id, session.user_id);
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { error: 'Failed to mark as read' };
  }
}

export async function markAllNotificationsAsRead() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(session.user_id);
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { error: 'Failed to mark all as read' };
  }
}

export async function createNotification(userId: string, title: string, message: string, link?: string, type: string = 'info') {
  // Internal function to be called by other actions
  try {
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, link, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, title, message, link || null, type);
    return { success: true, id };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { error: 'Failed to create notification' };
  }
}
