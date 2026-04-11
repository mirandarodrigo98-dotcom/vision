'use server';

import db from '@/lib/db';
import { AccessSchedule, AccessScheduleItem } from '@/types/access-schedule';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

export async function getAccessSchedules(): Promise<AccessSchedule[]> {
  const schedules = (await db.query('SELECT * FROM access_schedules ORDER BY name ASC', [])).rows;
  
  // Fetch items for each schedule
  const result: AccessSchedule[] = [];
  for (const schedule of schedules) {
    const items = (await db.query(`SELECT * FROM access_schedule_items WHERE schedule_id = $1 ORDER BY day_of_week, start_time`, [schedule.id])).rows;
    result.push({ ...schedule, items });
  }
  
  return result;
}

export async function getAccessSchedule(id: string): Promise<AccessSchedule | null> {
  const schedule = (await db.query(`SELECT * FROM access_schedules WHERE id = $1`, [id])).rows[0];
  
  if (!schedule) return null;

  const items = (await db.query(`SELECT * FROM access_schedule_items WHERE schedule_id = $1 ORDER BY day_of_week, start_time`, [schedule.id])).rows;
  
  return { ...schedule, items };
}


export type AccessScheduleInput = Omit<AccessSchedule, 'id' | 'created_at' | 'updated_at' | 'items'> & {
  items: Omit<AccessScheduleItem, 'id' | 'schedule_id'>[];
};

export async function createAccessSchedule(data: AccessScheduleInput) {
  const id = randomUUID();
  
  try {
    // Transaction handled by sequential operations (or could wrap if supported)
    await db.query(`
      INSERT INTO access_schedules (id, name, description, notification_minutes)
      VALUES ($1, $2, $3, $4)
    `, [id, data.name, data.description || null, data.notification_minutes]);

    for (const item of data.items) {
      await db.query(`
        INSERT INTO access_schedule_items (id, schedule_id, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5)
      `, [randomUUID(), id, item.day_of_week, item.start_time, item.end_time]);
    }

    revalidatePath('/admin/settings/access-schedules');
    revalidatePath('/admin/settings');
    return { success: true, id };
  } catch (error) {
    console.error('Error creating access schedule:', error);
    return { success: false, error: 'Erro ao criar tabela de horário.' };
  }
}

export async function updateAccessSchedule(id: string, data: AccessScheduleInput) {
  try {
    await db.query(`
      UPDATE access_schedules 
      SET name = $1, description = $2, notification_minutes = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [data.name, data.description || null, data.notification_minutes, id]);

    // Replace items: delete all and insert new ones
    await db.query(`DELETE FROM access_schedule_items WHERE schedule_id = $1`, [id]);

    for (const item of data.items) {
      await db.query(`
        INSERT INTO access_schedule_items (id, schedule_id, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5)
      `, [randomUUID(), id, item.day_of_week, item.start_time, item.end_time]);
    }

    revalidatePath('/admin/settings/access-schedules');
    revalidatePath(`/admin/settings/access-schedules/${id}/edit`);
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating access schedule:', error);
    return { success: false, error: 'Erro ao atualizar tabela de horário.' };
  }
}


export async function deleteAccessSchedule(id: string) {
  try {
    // Check if used by any user
    const users = (await db.query(`SELECT count(*) as count FROM users WHERE access_schedule_id = $1`, [id])).rows[0];
    if (users && users.count > 0) {
      return { success: false, error: 'Esta tabela de horário está vinculada a usuários e não pode ser excluída.' };
    }

    await db.query(`DELETE FROM access_schedules WHERE id = $1`, [id]);
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Error deleting access schedule:', error);
    return { success: false, error: 'Erro ao excluir tabela de horário.' };
  }
}

// Check if current time is allowed for the user
export async function checkUserAccess(userId: string): Promise<{ allowed: boolean; reason?: string; nextLogout?: Date }> {
  const user = (await db.query(`SELECT access_schedule_id, role FROM users WHERE id = $1`, [userId])).rows[0];
  
  if (!user) return { allowed: false, reason: 'Usuário não encontrado' };
  
  // Only apply to office users (admin, operator, etc? User said "Usuários do Escritório")
  // Usually "Usuários do Escritório" implies internal staff.
  // The roles are 'admin', 'operator', 'client_user'.
  // Assuming 'client_user' is NOT office staff.
  // But wait, the request said "Essa tabela de horários será válida apenas para Usuários do Escritório."
  // So if it's a client user, maybe we don't check? Or maybe we do if they have a schedule assigned?
  // The user explicitly renamed "Equipe" to "Usuários do Escritório". "Equipe" usually means internal team.
  // So 'admin' and 'operator' are office users. 'client_user' is client.
  
  // If user has no schedule assigned, access is allowed (or denied? Usually allowed if no restriction).
  if (!user.access_schedule_id) {
    return { allowed: true };
  }

  const schedule = await getAccessSchedule(user.access_schedule_id);
  if (!schedule) {
    // Schedule ID exists but schedule not found? Allow access to avoid lockout or deny?
    // Safer to allow and log error, or deny.
    // Let's assume if schedule is missing, rules don't apply.
    return { allowed: true };
  }

  const now = new Date();
  // Get Brazil time parts explicitly to avoid timezone parsing issues
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short', // Sun, Mon, Tue...
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const hourPart = parts.find(p => p.type === 'hour')?.value || '0';
  const minutePart = parts.find(p => p.type === 'minute')?.value || '0';
  const weekdayPart = parts.find(p => p.type === 'weekday')?.value || '';
  
  // Adjust 24h format explicitly if needed (some locales return 24h, en-US with hour12: false should be 0-23)
  // Check if value is '24' (some implementations do this for midnight) -> 0
  let currentHour = parseInt(hourPart);
  if (currentHour === 24) currentHour = 0;
  
  const currentMinute = parseInt(minutePart);
  const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

  // Map weekday string to 0-6
  const weekDayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  const currentDay = weekDayMap[weekdayPart];

  // Find rules for today
  const todayRules = schedule.items.filter(item => item.day_of_week === currentDay);
  
  if (todayRules.length === 0) {
    // No rules for today -> No access allowed? Or full access?
    // Usually "Allow only in established times". So if no time established, no access.
    return { allowed: false, reason: 'Acesso não permitido neste dia.' };
  }

  let isAllowed = false;
  let nextLogout: Date | undefined = undefined;

  for (const rule of todayRules) {
    if (currentTimeStr >= rule.start_time && currentTimeStr <= rule.end_time) {
      isAllowed = true;
      
      // Calculate logout time for this rule
      const [endH, endM] = rule.end_time.split(':').map(Number);
      
      // Calculate remaining duration in milliseconds
      // We know the current time in Brazil is currentHour:currentMinute
      // We want to reach endH:endM
      // Diff in minutes
      const diffInMinutes = (endH * 60 + endM) - (currentHour * 60 + currentMinute);
      
      // nextLogout is now + diff
      if (diffInMinutes > 0) {
        nextLogout = new Date(now.getTime() + diffInMinutes * 60 * 1000);
      } else {
        // Should not happen if we are inside the interval, unless seconds matter or logic edge case
        // If we are exactly at the end minute, we might want to logout soon.
        // Let's set it to now
        nextLogout = now;
      }
      
      break; // Found a matching rule
    }
  }

  if (!isAllowed) {
    return { allowed: false, reason: 'Fora do horário permitido.' };
  }

  return { allowed: true, nextLogout };
}

import { getSession } from '@/lib/auth';

export async function checkCurrentSessionAccess() {
  const session = await getSession(false); // Don't update last_seen_at on polling check
  if (!session) return { allowed: false, reason: 'Não autenticado' };
  
  return checkUserAccess(session.user_id);
}
