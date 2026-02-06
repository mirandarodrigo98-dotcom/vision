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
  forcePathStyle: true, // Required for R2 to ensure bucket is in path, not subdomain
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
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const getCommand = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileName
        });
        
        // Note: PutObjectCommand is for upload. For download link we need GetObjectCommand.
        
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

export async function getPresignedUploadUrl(fileName: string, mimeType: string): Promise<{ uploadUrl: string; fileKey: string; downloadLink: string }> {
    if (!R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME not configured');

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        ContentType: mimeType,
    });

    // Signed URL for PUT (Upload) - valid for 1 hour
    const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });

    let downloadLink = '';
    if (process.env.R2_PUBLIC_DOMAIN) {
        downloadLink = `${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;
    } else {
        downloadLink = await getR2DownloadLink(fileName);
    }

    return {
        uploadUrl,
        fileKey: fileName,
        downloadLink
    };
}
