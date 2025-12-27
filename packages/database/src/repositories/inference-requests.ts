import { DatabaseClient } from "../client";
import { ComplexityClass, Vendor } from "@ai-control/shared";
import * as crypto from "crypto";

export interface InferenceRequest {
  id: string;
  organizationId: string;
  userId: string | null;
  promptHash: string | null;
  promptLength: number;
  budgetRequested: number | null;
  complexityScore: number;
  complexityClass: ComplexityClass;
  hasCodeBlock: boolean;
  hasReasoningKeywords: boolean;
  hasStructuredPrompt: boolean;
  modelSelected: string;
  vendor: Vendor;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  truncated: boolean;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CreateInferenceRequestInput {
  organizationId: string;
  userId?: string;
  prompt: string;
  budgetRequested?: number;
  complexityScore: number;
  complexityClass: ComplexityClass;
  hasCodeBlock: boolean;
  hasReasoningKeywords: boolean;
  hasStructuredPrompt: boolean;
  modelSelected: string;
  vendor: Vendor;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  truncated: boolean;
  error?: string;
}

export class InferenceRequestsRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Create a new inference request log
   */
  async create(input: CreateInferenceRequestInput): Promise<InferenceRequest> {
    const promptHash = this.hashPrompt(input.prompt);

    const query = `
      INSERT INTO inference_requests (
        organization_id, user_id, prompt_hash, prompt_length, budget_requested,
        complexity_score, complexity_class, has_code_block, has_reasoning_keywords,
        has_structured_prompt, model_selected, vendor, input_tokens, output_tokens,
        total_tokens, input_cost, output_cost, total_cost, truncated, error, completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
      RETURNING *
    `;

    const values = [
      input.organizationId,
      input.userId || null,
      promptHash,
      input.prompt.length,
      input.budgetRequested || null,
      input.complexityScore,
      input.complexityClass,
      input.hasCodeBlock,
      input.hasReasoningKeywords,
      input.hasStructuredPrompt,
      input.modelSelected,
      input.vendor,
      input.inputTokens,
      input.outputTokens,
      input.totalTokens,
      input.inputCost,
      input.outputCost,
      input.totalCost,
      input.truncated,
      input.error || null,
    ];

    const result = await this.db.query<InferenceRequest>(query, values);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Get analytics for organization
   */
  async getAnalytics(organizationId: string, days: number = 30) {
    const query = `
      SELECT 
        COUNT(*) as total_requests,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost,
        SUM(CASE WHEN truncated THEN 1 ELSE 0 END) as truncated_count,
        SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as error_count
      FROM inference_requests
      WHERE organization_id = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
    `;

    const result = await this.db.query(query, [organizationId]);
    return result.rows[0];
  }

  /**
   * Get usage by model
   */
  async getUsageByModel(organizationId: string, days: number = 30) {
    const query = `
      SELECT 
        model_selected,
        vendor,
        COUNT(*) as request_count,
        SUM(total_cost) as total_cost,
        AVG(total_cost) as avg_cost
      FROM inference_requests
      WHERE organization_id = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY model_selected, vendor
      ORDER BY total_cost DESC
    `;

    const result = await this.db.query(query, [organizationId]);
    return result.rows;
  }

  /**
   * Get daily usage
   */
  async getDailyUsage(organizationId: string, days: number = 30) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as request_count,
        SUM(total_cost) as total_cost
      FROM inference_requests
      WHERE organization_id = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await this.db.query(query, [organizationId]);
    return result.rows;
  }

  /**
   * Hash prompt for privacy
   */
  private hashPrompt(prompt: string): string {
    return crypto.createHash("sha256").update(prompt).digest("hex");
  }

  /**
   * Map database row to InferenceRequest
   */
  private mapRow(row: any): InferenceRequest {
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      promptHash: row.prompt_hash,
      promptLength: row.prompt_length,
      budgetRequested: row.budget_requested
        ? parseFloat(row.budget_requested)
        : null,
      complexityScore: row.complexity_score,
      complexityClass: row.complexity_class,
      hasCodeBlock: row.has_code_block,
      hasReasoningKeywords: row.has_reasoning_keywords,
      hasStructuredPrompt: row.has_structured_prompt,
      modelSelected: row.model_selected,
      vendor: row.vendor,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      inputCost: parseFloat(row.input_cost),
      outputCost: parseFloat(row.output_cost),
      totalCost: parseFloat(row.total_cost),
      truncated: row.truncated,
      error: row.error,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
    };
  }
}
