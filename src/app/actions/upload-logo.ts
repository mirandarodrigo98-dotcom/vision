'use server';

import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function uploadSystemLogo(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { error: 'Nenhum arquivo enviado' };
    }

    if (file.size > 1024 * 1024) { // 1MB
        return { error: 'Arquivo muito grande (máx 1MB)' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const fileName = `system-logo-${Date.now()}.png`; 
    const filePath = join(uploadDir, fileName);
    
    await writeFile(filePath, buffer);

    // Update DB
    const oldLogo = await db.prepare("SELECT value FROM settings WHERE key = 'SYSTEM_LOGO_PATH'").get() as { value: string } | undefined;
    
    if (oldLogo?.value) {
        if (oldLogo.value.startsWith('/uploads/')) {
             const oldPath = join(process.cwd(), 'public', oldLogo.value);
             try {
                 await unlink(oldPath);
             } catch (e) {
                 console.error('Error deleting old logo:', e);
             }
        }
    }

    const publicPath = `/uploads/${fileName}`;
    await db.prepare(`
        INSERT INTO settings (key, value) 
        VALUES ('SYSTEM_LOGO_PATH', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(publicPath);

    revalidatePath('/');
    revalidatePath('/admin/settings');
    revalidatePath('/login');
    return { success: true, path: publicPath };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { error: error.message };
  }
}

export async function removeSystemLogo() {
    try {
        const oldLogo = await db.prepare("SELECT value FROM settings WHERE key = 'SYSTEM_LOGO_PATH'").get() as { value: string } | undefined;
    
        if (oldLogo?.value && oldLogo.value.startsWith('/uploads/')) {
             const oldPath = join(process.cwd(), 'public', oldLogo.value);
             try {
                 await unlink(oldPath);
             } catch (e) {
                 console.error('Error deleting old logo:', e);
             }
        }

        await db.prepare("DELETE FROM settings WHERE key = 'SYSTEM_LOGO_PATH'").run();
        
        revalidatePath('/');
        revalidatePath('/admin/settings');
        revalidatePath('/login');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function getSystemLogoUrl() {
    const logo = await db.prepare("SELECT value FROM settings WHERE key = 'SYSTEM_LOGO_PATH'").get() as { value: string } | undefined;
    return logo?.value || null;
}
