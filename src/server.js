import 'dotenv/config';
import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';

const fastify = Fastify({ logger: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabasePublishableKey);

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/ping', async (request, reply) => {
  const start = Date.now();

  try {
    const { data, error, status } = await supabase.from('pg_catalog.pg_tables').select('tablename').limit(1);

    if (error) {
      reply.code(503);
      return {
        success: false,
        error: error.message,
        supabase: 'unreachable'
      };
    }

    const latency = Date.now() - start;

    return {
      success: true,
      supabase: 'reachable',
      latency_ms: latency,
      status
    };
  } catch (err) {
    reply.code(503);
    return {
      success: false,
      error: err.message,
      supabase: 'error'
    };
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();