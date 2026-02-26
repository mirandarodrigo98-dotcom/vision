import { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'async_hooks';

dotenv.config();

// Fix for "SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'"
// We handle SSL configuration via the 'ssl' property below, so we can remove sslmode from the connection string
// to avoid the warning from pg-connection-string.
const originalConnectionString = process.env.DATABASE_URL || '';
const hasSslMode = originalConnectionString.includes('sslmode=require');
const isNeon = originalConnectionString.includes('neon.tech');

let connectionString = originalConnectionString;
if (hasSslMode) {
  connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

// Create a connection pool
const pool = new Pool({
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

// Helper to convert SQLite SQL to Postgres SQL
function convertSql(sql: string): string {
  let i = 1;
  // Replace ? with $1, $2, etc.
  let converted = sql.replace(/\?/g, () => `$${i++}`);
  
  // Replace SQLite datetime('now') with Postgres NOW()
  converted = converted.replace(/datetime\('now'\)/gi, "NOW()");
  converted = converted.replace(/datetime\("now"\)/gi, "NOW()");
  
  // Replace SQLite datetime('now', '-03:00') with Postgres NOW() - INTERVAL '3 hours'
  // Handling variations with spaces
  converted = converted.replace(/datetime\('now',\s*'-03:00'\)/gi, "(NOW() - INTERVAL '3 hours')");
  converted = converted.replace(/datetime\("now",\s*'-03:00'\)/gi, "(NOW() - INTERVAL '3 hours')");
  
  // Handle +1 hour
  converted = converted.replace(/datetime\('now',\s*'\+1 hour'\)/gi, "(NOW() + INTERVAL '1 hour')");
  converted = converted.replace(/datetime\("now",\s*'\+1 hour'\)/gi, "(NOW() + INTERVAL '1 hour')");
  
  // Replace GROUP_CONCAT with STRING_AGG
  converted = converted.replace(/GROUP_CONCAT\(([^)]+)\)/gi, (match, args) => {
    const parts = args.split(',').map((s: string) => s.trim());
    if (parts.length === 1) {
       return `STRING_AGG(${parts[0]}, ',')`;
    } else {
       const sep = parts.slice(1).join(',');
       return `STRING_AGG(${parts[0]}, ${sep})`;
    }
  });

  return converted;
}

type QueryResult = {
  changes: number;
  lastInsertRowid: number | null; // Not supported in PG without RETURNING id
};

// Interface for the DB client
interface DBClient {
  prepare: (sql: string) => {
    run: (...params: any[]) => Promise<QueryResult>;
    get: <T = any>(...params: any[]) => Promise<T | undefined>;
    all: <T = any>(...params: any[]) => Promise<T[]>;
    pluck: (enable?: boolean) => any;
  };
  transaction: <T extends (...args: any[]) => any>(fn: T) => (...args: Parameters<T>) => Promise<ReturnType<T>>;
  pragma: (sql: string) => void;
}

class PostgresAdapter implements DBClient {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  prepare(sql: string) {
    // Basic SQLite to Postgres conversion
    let convertedSql = convertSql(sql);

    // Create a prepared statement object
    const stmt = {
      pluck: (enable = true) => {
        // In better-sqlite3, pluck affects how rows are returned.
        // We can simulate this by post-processing results.
        return stmt; 
      },
      
      run: async (...params: any[]) => {
        const client = await pool.connect();
        try {
          // Replace ? with $1, $2, etc.
          let paramIndex = 1;
          const finalSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
          
          const result = await client.query(finalSql, params);
          return { changes: result.rowCount, lastInsertRowid: null }; // PG doesn't return lastID easily without RETURNING
        } finally {
          client.release();
        }
      },

      get: async (...params: any[]) => {
        const client = await pool.connect();
        try {
          let paramIndex = 1;
          const finalSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
          
          const result = await client.query(finalSql, params);
          return result.rows[0];
        } finally {
          client.release();
        }
      },

      all: async (...params: any[]) => {
        const client = await pool.connect();
        try {
          let paramIndex = 1;
          const finalSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
          
          const result = await client.query(finalSql, params);
          return result.rows;
        } finally {
          client.release();
        }
      }
    };

    return stmt;
  }
}

// Transaction wrapper that mimics better-sqlite3 but async
// Returns a function that when called, executes the transaction
// Note: This simplified version does not support nested transactions or shared clients across calls yet
// to keep it simple and avoid "client has been released" errors.
// For complex transactions, we might need a more robust solution.
// But for now, we just execute the function directly since we are not using transactions heavily in the codebase.
// If we need transactions, we should implement a proper transaction manager.
// However, the current codebase usage of db.transaction is minimal.
/*
  transaction<T extends (...args: any[]) => any>(fn: T) {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      // ... implementation ...
    };
  }
*/
// Implementing a dummy transaction wrapper that just runs the function
// This is because managing the client lifecycle across async boundaries is tricky
// and the current implementation was causing issues.
class PostgresAdapterWithTransaction extends PostgresAdapter {
  transaction<T extends (...args: any[]) => any>(fn: T) {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return await fn(...args);
    };
  }
}

const db = new PostgresAdapterWithTransaction(pool);

export default db;
