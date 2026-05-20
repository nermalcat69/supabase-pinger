import 'dotenv/config';
import Fastify from 'fastify';
import cron from 'node-cron';
import { db1, db2 } from './db.js';
import { testTable } from './schema.js';

const fastify = Fastify({ logger: true });

if (!process.env.DATABASE_URL_1 || !process.env.DATABASE_URL_2) {
  throw new Error('DATABASE_URL_1 and DATABASE_URL_2 must be set');
}

async function pingDatabase(db, label) {
  const start = Date.now();
  try {
    await db.insert(testTable).values({});
    const latency = Date.now() - start;
    return { success: true, latency_ms: latency, database: label };
  } catch (err) {
    return { success: false, error: err.message, database: label };
  }
}

cron.schedule('0 0 * * *', async () => {
  const results = await Promise.all([
    pingDatabase(db1, 'database_1'),
    pingDatabase(db2, 'database_2')
  ]);
  results.forEach(r => {
    if (r.success) {
      fastify.log.info(r, 'Cron ping succeeded');
    } else {
      fastify.log.error(r, 'Cron ping failed');
    }
  });
});

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/ping', async (request, reply) => {
  const results = await Promise.all([
    pingDatabase(db1, 'database_1'),
    pingDatabase(db2, 'database_2')
  ]);

  const allSuccess = results.every(r => r.success);
  if (!allSuccess) {
    reply.code(503);
  }

  return {
    success: allSuccess,
    databases: results
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: 6929, host: '0.0.0.0' });
    console.log('Server running at http://localhost:6929');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
