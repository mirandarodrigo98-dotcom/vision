import { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'async_hooks';

dotenv.config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined),
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
    const convertedSql = convertSql(sql);
    let shouldPluck = false;
    
    const stmt = {
      pluck: (enable = true) => {
        shouldPluck = enable;
        return stmt;
      },
      run: async (...params: any[]): Promise<QueryResult> => {
        const txClient = txContext.getStore();
        const client = txClient || await this.pool.connect();
        try {
          const res = await client.query(convertedSql, params);
          return { changes: res.rowCount || 0, lastInsertRowid: null };
        } finally {
          if (!txClient) client.release();
        }
      },
      get: async <T = any>(...params: any[]): Promise<T | undefined> => {
        const txClient = txContext.getStore();
        const client = txClient || await this.pool.connect();
        try {
          const res = await client.query(convertedSql, params);
          const row = res.rows[0];
          if (shouldPluck && row) {
            return Object.values(row)[0] as any;
          }
          return row;
        } finally {
          if (!txClient) client.release();
        }
      },
      all: async <T = any>(...params: any[]): Promise<T[]> => {
        const txClient = txContext.getStore();
        const client = txClient || await this.pool.connect();
        try {
          const res = await client.query(convertedSql, params);
          if (shouldPluck) {
            return res.rows.map(row => Object.values(row)[0]) as any[];
          }
          return res.rows;
        } finally {
          if (!txClient) client.release();
        }
      }
    };

    return stmt;
  }

  // Transaction wrapper that mimics better-sqlite3 but async
  // Returns a function that when called, executes the transaction
  transaction<T extends (...args: any[]) => any>(fn: T) {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      // If already in a transaction, just run the function (nested transaction support could be added with SAVEPOINT)
      // For now, assuming flat transactions or just reusing the connection
      const existingClient = txContext.getStore();
      if (existingClient) {
        return await fn(...args);
      }

      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await txContext.run(client, async () => {
          return await fn(...args);
        });
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    };
  }

  pragma(sql: string) {
    // No-op for Postgres
  }
}

const db = new PostgresAdapter(pool);

export default db;
