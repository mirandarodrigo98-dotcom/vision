'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function getUnreadNotifications() {
  const session = await getSession();
  if (!session) return [];

  try {
    const notifications = await db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? AND read = 0 
      ORDER BY created_at DESC
    `).all(session.user_id);
    
    return notifications as { 
      id: string; 
      title: string; 
      message: string; 
      link: string | null; 
      created_at: string 
    }[];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
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

export async function createNotification(userId: string, title: string, message: string, link?: string) {
  // Internal function to be called by other actions
  try {
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, link)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, title, message, link || null);
    return { success: true, id };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { error: 'Failed to create notification' };
  }
}
