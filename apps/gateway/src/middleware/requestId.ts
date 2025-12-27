import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = randomUUID();
  request.headers['x-request-id'] = requestId;
  reply.header('x-request-id', requestId);
}