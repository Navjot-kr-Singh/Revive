import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: '.env.local' });
  dotenv.config(); // fallback to .env
}

const connectionString = process.env.DATABASE_URL;

// For server-side use only
function createDb() {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

// Singleton pattern for the database connection
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export type Database = ReturnType<typeof createDb>;
