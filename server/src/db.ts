import pg from 'pg';

export interface QueryResult<R> {
  rows: R[];
  rowCount: number;
}

export interface Db {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

type Queryable = Pick<pg.Pool | pg.PoolClient, 'query'>;

function queryWith(client: Queryable): Db['query'] {
  return async <R>(text: string, params?: unknown[]) => {
    const result = await client.query(text, params);
    return { rows: result.rows as R[], rowCount: result.rowCount ?? 0 };
  };
}

export function createPgDb(connectionString: string): Db & { close(): Promise<void> } {
  const pool = new pg.Pool({ connectionString, max: 10 });

  return {
    query: queryWith(pool),

    async transaction(fn) {
      const client = await pool.connect();
      const tx: Db = { query: queryWith(client), transaction: (inner) => inner(tx) };
      try {
        await client.query('BEGIN');
        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    close: () => pool.end(),
  };
}
