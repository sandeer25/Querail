import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config';
import { requestIdMiddleware } from './middleware/requestId';
import { healthRoutes } from './routes/health';
import { inferRoutes } from './routes/infer';

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
  });

  // Global middleware
  fastify.addHook('onRequest', requestIdMiddleware);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(inferRoutes);

  return fastify;
}