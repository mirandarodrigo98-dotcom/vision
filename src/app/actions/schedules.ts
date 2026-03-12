'use server';

import db from '@/lib/db';
import { AccessSchedule, AccessScheduleItem } from '@/types/access-schedule';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

export async function getAccessSchedules(): Promise<AccessSchedule[]> {
  const schedules = await db.prepare('SELECT * FROM access_schedules ORDER BY name ASC').all<Omit<AccessSchedule, 'items'>>();
  
  // Fetch items for each schedule
  const result: AccessSchedule[] = [];
  for (const schedule of schedules) {
    const items = await db.prepare('SELECT * FROM access_schedule_items WHERE schedule_id = ? ORDER BY day_of_week, start_time').all<AccessScheduleItem>(schedule.id);
    result.push({ ...schedule, items });
  }
  
  return result;
}

export async function getAccessSchedule(id: string): Promise<AccessSchedule | null> {
  const schedule = await db.prepare('SELECT * FROM access_schedules WHERE id = ?').get<Omit<AccessSchedule, 'items'>>(id);
  
  if (!schedule) return null;

  const items = await db.prepare('SELECT * FROM access_schedule_items WHERE schedule_id = ? ORDER BY day_of_week, start_time').all<AccessScheduleItem>(schedule.id);
  
  return { ...schedule, items };
}


export type AccessScheduleInput = Omit<AccessSchedule, 'id' | 'created_at' | 'updated_at' | 'items'> & {
  items: Omit<AccessScheduleItem, 'id' | 'schedule_id'>[];
};

export async function createAccessSchedule(data: AccessScheduleInput) {
  const id = randomUUID();
  
  try {
    // Transaction handled by sequential operations (or could wrap if supported)
    await db.prepare(`
      INSERT INTO access_schedules (id, name, description, notification_minutes)
      VALUES (?, ?, ?, ?)
    `).run(id, data.name, data.description || null, data.notification_minutes);

    for (const item of data.items) {
      await db.prepare(`
        INSERT INTO access_schedule_items (id, schedule_id, day_of_week, start_time, end_time)
        VALUES (?, ?, ?, ?, ?)
      `).run(randomUUID(), id, item.day_of_week, item.start_time, item.end_time);
    }

    revalidatePath('/admin/settings');
    return { success: true, id };
  } catch (error) {
    console.error('Error creating access schedule:', error);
    return { success: false, error: 'Erro ao criar tabela de horário.' };
  }
}

export async function updateAccessSchedule(id: string, data: AccessScheduleInput) {
  try {
    await db.prepare(`
      UPDATE access_schedules 
      SET name = ?, description = ?, notification_minutes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.name, data.description || null, data.notification_minutes, id);

    // Replace items: delete all and insert new ones
    await db.prepare('DELETE FROM access_schedule_items WHERE schedule_id = ?').run(id);

    for (const item of data.items) {
      await db.prepare(`
        INSERT INTO access_schedule_items (id, schedule_id, day_of_week, start_time, end_time)
        VALUES (?, ?, ?, ?, ?)
      `).run(randomUUID(), id, item.day_of_week, item.start_time, item.end_time);
    }

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
    const users = await db.prepare('SELECT count(*) as count FROM users WHERE access_schedule_id = ?').get<{count: number}>(id);
    if (users && users.count > 0) {
      return { success: false, error: 'Esta tabela de horário está vinculada a usuários e não pode ser excluída.' };
    }

    await db.prepare('DELETE FROM access_schedules WHERE id = ?').run(id);
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Error deleting access schedule:', error);
    return { success: false, error: 'Erro ao excluir tabela de horário.' };
  }
}

// Check if current time is allowed for the user
export async function checkUserAccess(userId: string): Promise<{ allowed: boolean; reason?: string; nextLogout?: Date }> {
  const user = await db.prepare('SELECT access_schedule_id, role FROM users WHERE id = ?').get<{access_schedule_id: string | null, role: string}>(userId);
  
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
  // Adjust for timezone -03:00 (Brasilia) if server is UTC, but database operations use CURRENT_TIMESTAMP/NOW().
  // JS Date is in local time of the server. If server is UTC, we need to handle timezone.
  // The user is likely in Brazil.
  // We should compare times in Brazil time.
  // However, `now.getDay()` returns local day.
  
  // Let's use a helper to get Brazil time components.
  const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const currentDay = brazilTime.getDay(); // 0-6
  const currentHour = brazilTime.getHours();
  const currentMinute = brazilTime.getMinutes();
  const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

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
      const ruleLogout = new Date(brazilTime);
      ruleLogout.setHours(endH, endM, 0, 0);
      
      // If this rule extends to next day? Assuming times are within 00:00-23:59
      
      // Since we break on the first match, we just assign the logout time of this rule.
      nextLogout = ruleLogout;
      
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
