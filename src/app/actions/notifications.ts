'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationItem {
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
    const notifications = (await db.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 AND read = FALSE 
      ORDER BY created_at DESC
    `, [session.user_id])).rows;
    
    // Converter boolean integer para boolean real
    return notifications.map((n: any) => ({
      ...n,
      read: Boolean(n.read)
    })) as NotificationItem[];
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
}

export async function getUserNotifications(limit = 20, offset = 0) {
  const session = await getSession();
  if (!session) return { notifications: [], total: 0 };

  try {
    const notifications = (await db.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [session.user_id, limit, offset])).rows;

    const total = (await db.query(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = $1
    `, [session.user_id])).rows[0] as { count: number };
    
    return {
      notifications: notifications.map((n: any) => ({
        ...n,
        read: Boolean(n.read)
      })) as NotificationItem[],
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
    await db.query(`UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`, [id, session.user_id]);
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
    await db.query(`UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`, [session.user_id]);
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
    await db.query(`
      INSERT INTO notifications (id, user_id, title, message, link, type)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, userId, title, message, link || null, type]);
    return { success: true, id };
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return { error: 'Failed to create notification', details: error.message };
  }
}
