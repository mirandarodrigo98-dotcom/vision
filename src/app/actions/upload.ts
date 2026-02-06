'use server';

import { getPresignedUploadUrl } from '@/lib/r2';
import { randomUUID } from 'crypto';
import path from 'path';

export async function getUploadUrl(fileName: string, fileType: string) {
    try {
        // Create a unique file key to prevent collisions
        // We use a simpler naming strategy for the pre-upload: uuid-filename
        // The real protocol number is generated later, but that's fine.
        const uuid = randomUUID();
        const cleanFileName = path.basename(fileName).replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `${uuid}-${cleanFileName}`;
        
        const { uploadUrl, downloadLink } = await getPresignedUploadUrl(fileKey, fileType);
        
        return { 
            success: true, 
            uploadUrl, 
            fileKey,
            downloadLink 
        };
    } catch (error) {
        console.error('Error generating upload URL:', error);
        return { success: false, error: 'Failed to generate upload URL' };
    }
}
