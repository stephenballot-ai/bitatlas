import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

export class TestDatabase {
  private client: Client;
  private testDbName = `bitatlas_test_${Date.now()}`;

  constructor() {
    this.client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'bitatlas',
      password: process.env.DB_PASSWORD || 'password',
      database: 'postgres' // Connect to postgres to create test db
    });
  }

  async setup(): Promise<string> {
    await this.client.connect();
    
    // Create test database
    await this.client.query(`CREATE DATABASE ${this.testDbName}`);
    
    // Disconnect from postgres and connect to test db
    await this.client.end();
    
    this.client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'bitatlas',
      password: process.env.DB_PASSWORD || 'password',
      database: this.testDbName
    });
    
    await this.client.connect();
    
    // Run migrations
    const migrationPath = path.join(__dirname, '../../database/migrations/001_create_initial_schema.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    await this.client.query(migration);
    
    return this.testDbName;
  }

  async teardown(): Promise<void> {
    await this.client.end();
    
    // Connect back to postgres to drop test db
    const adminClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'bitatlas',
      password: process.env.DB_PASSWORD || 'password',
      database: 'postgres'
    });
    
    await adminClient.connect();
    await adminClient.query(`DROP DATABASE ${this.testDbName}`);
    await adminClient.end();
  }

  getConnectionString(): string {
    return `postgresql://${process.env.DB_USER || 'bitatlas'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${this.testDbName}`;
  }
}