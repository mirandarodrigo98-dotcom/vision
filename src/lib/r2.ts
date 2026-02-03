import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// R2 is S3 compatible, so we use the S3 client
const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadToR2(
    fileBuffer: Buffer, 
    fileName: string, 
    mimeType: string
): Promise<{ downloadLink: string; fileKey: string } | null> {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
        console.warn('Cloudflare R2 credentials not found in .env');
        return null;
    }

    try {
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: mimeType,
        });

        await S3.send(command);

        // Generate a signed URL for downloading (valid for 7 days - 604800 seconds)
        // Or if the bucket is public, we can just construct the URL.
        // Assuming private bucket for security, so we use signed URL.
        const getCommand = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileName
        });
        
        // Note: PutObjectCommand is for upload. For download link we need GetObjectCommand.
        // But we just want to return a link.
        // If we want a long-lived link, we might need a public bucket or custom domain.
        // For "direct download", a signed URL is good but expires.
        // If the user wants a permanent link, they should set up a custom domain on R2.
        // Let's assume for now we generate a signed URL for 7 days or use a public custom domain if provided.
        
        let downloadLink = '';
        
        if (process.env.R2_PUBLIC_DOMAIN) {
            // If a custom domain is configured (e.g., files.mydomain.com)
            downloadLink = `${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;
        } else {
             downloadLink = await getR2DownloadLink(fileName);
        }

        return {
            downloadLink,
            fileKey: fileName
        };

    } catch (error) {
        console.error('Error uploading to Cloudflare R2:', error);
        throw error;
    }
}

export async function getR2DownloadLink(fileKey: string): Promise<string> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    // Fallback to signed URL (note: this requires GetObject permission)
    const getCmd = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileKey
    });
    
    // Generate signed URL for 7 days
    return await getSignedUrl(S3, getCmd, { expiresIn: 604800 });
}
