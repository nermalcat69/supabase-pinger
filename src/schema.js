import { pgTable, bigint, timestamp } from 'drizzle-orm/pg-core';

export const testTable = pgTable('test_table', {
  id: bigint('id', { mode: 'number' }).generatedAlwaysAsIdentity().primaryKey(),
  pingedAt: timestamp('pinged_at', { withTimezone: true }).notNull().defaultNow(),
});
