import crypto from 'crypto';

const ENCRYPTED_PREFIX = 'enc:v1';
const KEY_SALT = 'vision-secret-crypto-v1';

function getBaseSecret() {
  const baseSecret = process.env.INTEGRATION_SECRET_KEY || process.env.DATABASE_URL;
  if (!baseSecret) {
    throw new Error('Nenhuma chave de criptografia do servidor foi encontrada para proteger os segredos.');
  }
  return baseSecret;
}

function getKey() {
  return crypto.scryptSync(getBaseSecret(), KEY_SALT, 32);
}

export function isEncryptedSecret(value: string | null | undefined) {
  return Boolean(value && value.startsWith(`${ENCRYPTED_PREFIX}:`));
}

export function encryptSecret(plainText: string | null | undefined) {
  if (!plainText) return plainText ?? null;
  if (isEncryptedSecret(plainText)) return plainText;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decryptSecret(cipherText: string | null | undefined) {
  if (!cipherText) return cipherText ?? null;
  if (!isEncryptedSecret(cipherText)) return cipherText;

  const parts = cipherText.split(':');
  if (parts.length !== 5) {
    throw new Error('Segredo criptografado em formato invalido.');
  }

  const [, , ivBase64, tagBase64, payloadBase64] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadBase64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
