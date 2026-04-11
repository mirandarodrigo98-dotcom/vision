import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';

// Fix for SSL mode warning
const originalConnectionString = process.env.DATABASE_URL || '';
const hasSslMode = originalConnectionString.includes('sslmode=require');
const isNeon = originalConnectionString.includes('neon.tech');

let connectionString = originalConnectionString;
if (hasSslMode) {
  connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

// Create a connection pool
export const pool = new Pool({
  connectionString: connectionString,
  ssl: (isNeon || hasSslMode || process.env.NODE_ENV === 'production') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

if (!process.env.DATABASE_URL && typeof window === 'undefined') {
  console.warn("⚠️ DATABASE_URL is not defined. The application requires a PostgreSQL connection string.");
}

// AsyncLocalStorage to manage transaction context
const txContext = new AsyncLocalStorage<PoolClient>();

// Create the db object that mimics Pool but uses txContext if available
const db = {
  async query<R extends QueryResultRow = any, I extends any[] = any[]>(
    queryTextOrConfig: string | { text: string; values?: I },
    values?: I
  ): Promise<QueryResult<R>> {
    const client = txContext.getStore();
    if (client) {
      return client.query<R, I>(queryTextOrConfig, values);
    }
    return pool.query<R, I>(queryTextOrConfig, values);
  },

  async connect(): Promise<PoolClient> {
    return pool.connect();
  },

  // Keep the exact same signature for transaction to avoid breaking the 29 usages
  transaction<T extends (...args: any[]) => any>(fn: T) {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Execute the callback within the async local storage context
        // so that all queries inside it use this same client connection
        const result = await txContext.run(client, async () => {
           return await fn(...args);
        });
        
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    };
  }
};

export default db;
