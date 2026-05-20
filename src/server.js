import 'dotenv/config';
import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const fastify = Fastify({ logger: true });

if (!process.env.SUPABASE_URL_1 || !process.env.SUPABASE_SECRET_KEY_1 || !process.env.SUPABASE_URL_2 || !process.env.SUPABASE_SECRET_KEY_2) {
  throw new Error('SUPABASE_URL_1, SUPABASE_SECRET_KEY_1, SUPABASE_URL_2, and SUPABASE_SECRET_KEY_2 must be set');
}

const supabase1 = createClient(process.env.SUPABASE_URL_1, process.env.SUPABASE_SECRET_KEY_1);
const supabase2 = createClient(process.env.SUPABASE_URL_2, process.env.SUPABASE_SECRET_KEY_2);

async function pingDatabase(supabase, label) {
  const start = Date.now();
  try {
    const { error } = await supabase.from('test_table').insert({ pinged_at: new Date().toISOString() });
    const latency = Date.now() - start;
    if (error) {
      return { success: false, error: error.message, latency_ms: latency, database: label };
    }
    return { success: true, latency_ms: latency, database: label };
  } catch (err) {
    return { success: false, error: err.message, database: label };
  }
}

cron.schedule('0 0 * * *', async () => {
  const results = await Promise.all([
    pingDatabase(supabase1, 'database_1'),
    pingDatabase(supabase2, 'database_2')
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
    pingDatabase(supabase1, 'database_1'),
    pingDatabase(supabase2, 'database_2')
  ]);

  const allSuccess = results.every(r => r.success);
  if (!allSuccess) {
    reply.code(503);
  }

  return { success: allSuccess, databases: results };
});

const start = async () => {
  try {
    await fastify.listen({ port: 6929, host: '0.0.0.0' });
    console.log('Server running at http://localhost:6929');
    const results = await Promise.all([
      pingDatabase(supabase1, 'database_1'),
      pingDatabase(supabase2, 'database_2')
    ]);
    results.forEach(r => {
      if (r.success) {
        fastify.log.info(r, 'Startup ping succeeded');
      } else {
        fastify.log.error(r, 'Startup ping failed');
      }
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
