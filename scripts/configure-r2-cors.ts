
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

async function main() {
    console.log(`Configuring CORS for bucket: ${R2_BUCKET_NAME}...`);
    
    const corsRules = [
        {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET", "HEAD", "DELETE"],
            AllowedOrigins: ["*", "http://localhost:3000", "https://vision-piloto.vercel.app"], // Adicionei localhost e domínio provável
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600
        }
    ];

    try {
        await S3.send(new PutBucketCorsCommand({
            Bucket: R2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: corsRules
            }
        }));
        console.log('CORS configuration updated successfully!');
        console.log('New Rules:', JSON.stringify(corsRules, null, 2));
    } catch (error) {
        console.error('Error configuring CORS:', error);
    }
}

main();
