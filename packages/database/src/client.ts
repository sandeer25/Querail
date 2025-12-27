import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export class DatabaseClient {
  private pool: Pool;
  private static instance: DatabaseClient;

  private constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err: Error) => {
      console.error('Unexpected database error:', err);
    });
  }

  static getInstance(connectionString?: string): DatabaseClient {
    if (!DatabaseClient.instance) {
      if (!connectionString) {
        throw new Error('Database connection string required');
      }
      DatabaseClient.instance = new DatabaseClient(connectionString);
    }
    return DatabaseClient.instance;
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      if (process.env.LOG_QUERIES === 'true') {
        console.log('Query executed:', { text, duration, rows: result.rowCount });
      }

      return result;
    } catch (error) {
      console.error('Database query error:', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  getStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }
}

export function initDatabase(connectionString: string): DatabaseClient {
  return DatabaseClient.getInstance(connectionString);
}

export function getDatabase(): DatabaseClient {
  return DatabaseClient.getInstance();
}