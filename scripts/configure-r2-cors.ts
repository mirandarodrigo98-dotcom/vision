import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('Missing environment variables');
    process.exit(1);
}

const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

import * as fs from 'fs';

async function main() {
    console.log(`Configuring CORS for bucket: ${R2_BUCKET_NAME}...`);
    
    try {
        await S3.send(new PutBucketCorsCommand({
            Bucket: R2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
                        AllowedOrigins: ['*'],
                        ExposeHeaders: ['ETag'],
                        MaxAgeSeconds: 3600
                    }
                ]
            }
        }));
        const msg = '✅ CORS configuration applied successfully!';
        console.log(msg);
        fs.writeFileSync('cors-result.txt', msg);
    } catch (error: any) {
        const msg = `❌ Error applying CORS configuration: ${error.message || error}`;
        console.error(msg);
        fs.writeFileSync('cors-result.txt', msg);
    }
}

main();
