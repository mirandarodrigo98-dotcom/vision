'use server';

import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { uploadToR2 } from '@/lib/r2';

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
    const fileName = `system-logo-${Date.now()}.png`; 
    
    let publicPath = '';

    // Tenta fazer upload para o R2 (Cloudflare) primeiro
    // Se as credenciais não estiverem configuradas, o uploadToR2 retorna null
    // Nesse caso, fazemos fallback para o sistema de arquivos local (apenas dev)
    const r2Result = await uploadToR2(buffer, fileName, file.type || 'image/png');

    if (r2Result) {
        publicPath = r2Result.downloadLink;
    } else {
        // Fallback para armazenamento local (apenas desenvolvimento)
        // Em produção na Vercel, isso vai falhar se não tiver R2 configurado
        if (process.env.NODE_ENV === 'production') {
             return { error: 'Armazenamento R2 não configurado para produção.' };
        }

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });
        
        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        publicPath = `/uploads/${fileName}`;
    }

    // Update DB
    const oldLogo = await db.prepare("SELECT value FROM settings WHERE key = 'SYSTEM_LOGO_PATH'").get() as { value: string } | undefined;
    
    // Tenta remover logo antiga se for local
    if (oldLogo?.value && oldLogo.value.startsWith('/uploads/')) {
         const oldPath = join(process.cwd(), 'public', oldLogo.value);
         try {
             await unlink(oldPath);
         } catch (e) {
             console.error('Error deleting old logo:', e);
         }
    }

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
    
    if (!logo?.value) return null;

    let url = logo.value;

    // If it's a pre-signed R2 URL, it might be expired. We need to extract the file key and regenerate it.
    if (url.includes('X-Amz-Algorithm=AWS4-HMAC-SHA256') && url.includes('X-Amz-Expires=')) {
        try {
            // Extract the file key from the URL.
            // Example URL: https://<account-id>.r2.cloudflarestorage.com/<bucket-name>/system-logo-1773278568739.png?X-Amz-...
            const parsedUrl = new URL(url);
            
            // The pathname is typically /<bucket-name>/<file-key> or just /<file-key>
            // We just need everything after the first slash, or we can extract the filename.
            const pathParts = parsedUrl.pathname.split('/');
            const fileName = pathParts[pathParts.length - 1]; // system-logo-123.png
            
            if (fileName && fileName.startsWith('system-logo-')) {
                const { getR2DownloadLink } = await import('@/lib/r2');
                const freshUrl = await getR2DownloadLink(fileName);
                return freshUrl;
            }
        } catch (e) {
            console.error('Failed to regenerate pre-signed logo URL:', e);
            // Fall back to returning the expired one or null
        }
    }

    return url;
}
