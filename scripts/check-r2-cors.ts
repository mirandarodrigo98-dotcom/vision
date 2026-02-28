import { S3Client, GetBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

console.log('Starting script...');
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
    console.log(`Checking CORS for bucket: ${R2_BUCKET_NAME}...`);
    try {
        const data = await S3.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET_NAME }));
        console.log('Current CORS Configuration:', JSON.stringify(data.CORSRules, null, 2));
    } catch (error) {
        console.error('Error fetching CORS:', error);
    }
}

main();
