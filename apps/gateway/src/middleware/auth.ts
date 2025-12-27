import { FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase } from '@ai-control/database';
import { ApiKeysRepository } from '@ai-control/database';
import { AuthenticatedRequest } from '../types';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
    });
  }

  // Extract API key from "Bearer <key>" format
  const apiKey = authHeader.replace('Bearer ', '').trim();

  if (!apiKey.startsWith('sk-')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key format',
    });
  }

  try {
    const db = getDatabase();
    const apiKeysRepo = new ApiKeysRepository(db);

    const keyData = await apiKeysRepo.findByKey(apiKey);

    if (!keyData) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
    }

    // Attach organization ID to request
    (request as AuthenticatedRequest).organizationId = keyData.organizationId;
    (request as AuthenticatedRequest).apiKeyId = keyData.id;

    // Update last used timestamp (async, don't await)
    apiKeysRepo.updateLastUsed(keyData.id).catch(err => {
      console.error('Failed to update API key last used:', err);
    });

  } catch (error) {
    console.error('Auth middleware error:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}