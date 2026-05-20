import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const sql1 = postgres(process.env.DATABASE_URL_1);
const sql2 = postgres(process.env.DATABASE_URL_2);

export const db1 = drizzle(sql1);
export const db2 = drizzle(sql2);
