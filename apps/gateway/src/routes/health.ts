import { FastifyInstance } from 'fastify';
import { getDatabase } from '@ai-control/database';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    const db = getDatabase();
    const dbHealthy = await db.healthCheck();

    const health = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
    };

    const statusCode = dbHealthy ? 200 : 503;
    return reply.code(statusCode).send(health);
  });
}