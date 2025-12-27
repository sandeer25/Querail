import { FastifyRequest } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  organizationId?: string;
  apiKeyId?: string;
}