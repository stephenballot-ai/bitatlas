import { Pool, Client } from 'pg';
import fs from 'fs';
import path from 'path';

export class Database {
  private pool: Pool;
  private static instance: Database;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle connection errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    const res = await this.pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    
    return res;
  }

  public async getClient() {
    return this.pool.connect();
  }

  public async runMigrations(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Get list of executed migrations
      const executedMigrations = await client.query(
        'SELECT filename FROM migrations ORDER BY id'
      );
      const executedFiles = executedMigrations.rows.map(row => row.filename);

      // Read migration files
      const migrationsDir = path.join(__dirname, '../../../database/migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      // Execute new migrations
      for (const filename of migrationFiles) {
        if (!executedFiles.includes(filename)) {
          console.log(`Running migration: ${filename}`);
          
          const migrationPath = path.join(migrationsDir, filename);
          const migration = fs.readFileSync(migrationPath, 'utf8');
          
          await client.query(migration);
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [filename]
          );
          
          console.log(`Migration ${filename} completed`);
        }
      }

      await client.query('COMMIT');
      console.log('All migrations completed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = Database.getInstance();