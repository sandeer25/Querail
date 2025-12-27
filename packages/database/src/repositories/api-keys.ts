import { DatabaseClient } from '../client';
import * as crypto from 'crypto';

export interface ApiKey {
  id: string;
  organizationId: string;
  keyHash: string;
  name: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface CreateApiKeyInput {
  organizationId: string;
  name?: string;
}

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  rawKey: string;
}

export class ApiKeysRepository {
  constructor(private db: DatabaseClient) {}

  async create(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
    const rawKey = `sk-${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);

    const query = `
      INSERT INTO api_keys (organization_id, key_hash, name)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [input.organizationId, keyHash, input.name || null];
    const result = await this.db.query<any>(query, values);

    return {
      apiKey: this.mapRow(result.rows[0]),
      rawKey,
    };
  }

  async findByKey(rawKey: string): Promise<ApiKey | null> {
    const keyHash = this.hashKey(rawKey);
    const query = `
      SELECT * FROM api_keys 
      WHERE key_hash = $1 AND revoked_at IS NULL
    `;
    
    const result = await this.db.query<any>(query, [keyHash]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async updateLastUsed(id: string): Promise<void> {
    const query = `
      UPDATE api_keys 
      SET last_used_at = NOW() 
      WHERE id = $1
    `;
    
    await this.db.query(query, [id]);
  }

  async revoke(id: string): Promise<boolean> {
    const query = `
      UPDATE api_keys 
      SET revoked_at = NOW() 
      WHERE id = $1 AND revoked_at IS NULL
    `;
    
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async listByOrganization(organizationId: string): Promise<ApiKey[]> {
    const query = `
      SELECT * FROM api_keys 
      WHERE organization_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.query<any>(query, [organizationId]);
    return result.rows.map((row: any) => this.mapRow(row));
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private mapRow(row: any): ApiKey {
    return {
      id: row.id,
      organizationId: row.organization_id,
      keyHash: row.key_hash,
      name: row.name,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
      createdAt: new Date(row.created_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    };
  }
}