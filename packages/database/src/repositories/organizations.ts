import { DatabaseClient } from '../client';
import { OrganizationConfig, Vendor } from '@ai-control/shared';

export interface CreateOrganizationInput {
  name: string;
  defaultBudget?: number;
  allowedVendors?: Vendor[];
}

export interface UpdateOrganizationInput {
  name?: string;
  defaultBudget?: number;
  allowedVendors?: Vendor[];
}

export class OrganizationsRepository {
  constructor(private db: DatabaseClient) {}

  async create(input: CreateOrganizationInput): Promise<OrganizationConfig> {
    const query = `
      INSERT INTO organizations (name, default_budget, allowed_vendors)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [
      input.name,
      input.defaultBudget || 1.0,
      input.allowedVendors || ['openai', 'anthropic'],
    ];

    const result = await this.db.query<any>(query, values);
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<OrganizationConfig | null> {
    const query = 'SELECT * FROM organizations WHERE id = $1';
    const result = await this.db.query<any>(query, [id]);
    
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<OrganizationConfig | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(input.name);
    }

    if (input.defaultBudget !== undefined) {
      fields.push(`default_budget = $${paramCount++}`);
      values.push(input.defaultBudget);
    }

    if (input.allowedVendors !== undefined) {
      fields.push(`allowed_vendors = $${paramCount++}`);
      values.push(input.allowedVendors);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE organizations
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query<any>(query, values);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM organizations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async list(limit: number = 100, offset: number = 0): Promise<OrganizationConfig[]> {
    const query = `
      SELECT * FROM organizations
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await this.db.query<any>(query, [limit, offset]);
    return result.rows.map((row: any) => this.mapRow(row));
  }

  private mapRow(row: any): OrganizationConfig {
    return {
      id: row.id,
      name: row.name,
      defaultBudget: parseFloat(row.default_budget),
      allowedVendors: row.allowed_vendors,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}