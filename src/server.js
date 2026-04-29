import 'dotenv/config';
import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

const fastify = Fastify({ logger: true });

const supabaseUrl1 = process.env.SUPABASE_URL_1;
const supabasePublishableKey1 = process.env.SUPABASE_PUBLISHABLE_KEY_1;
const supabaseUrl2 = process.env.SUPABASE_URL_2;
const supabasePublishableKey2 = process.env.SUPABASE_PUBLISHABLE_KEY_2;

if (!supabaseUrl1 || !supabasePublishableKey1 || !supabaseUrl2 || !supabasePublishableKey2) {
  throw new Error('SUPABASE_URL_1, SUPABASE_PUBLISHABLE_KEY_1, SUPABASE_URL_2, and SUPABASE_PUBLISHABLE_KEY_2 must be set');
}

const supabase1 = createClient(supabaseUrl1, supabasePublishableKey1);
const supabase2 = createClient(supabaseUrl2, supabasePublishableKey2);

async function pingDatabase(supabase, label) {
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('product_requests').select('*').limit(2);
    const latency = Date.now() - start;
    if (error) {
      return { success: false, error: error.message, latency_ms: latency, database: label };
    } else {
      return { success: true, latency_ms: latency, database: label };
    }
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