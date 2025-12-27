// Model Vendors
export type Vendor = 'openai' | 'anthropic';

// Model Tiers
export type ModelTier = 'low' | 'medium' | 'high';

// Complexity Classes
export type ComplexityClass = 'low' | 'medium' | 'high';

// Model Configuration
export interface ModelConfig {
    vendor: Vendor;
    model: string;
    tier: ModelTier;
    inputCostPer1k: number;  // USD per 1K tokens
    outputCostPer1k: number; // USD per 1K tokens
}

// Classifier Result
export interface ClassifierResult {
    score: number;
    complexityClass: ComplexityClass;
    reasoning: string[];
    metadata: {
        tokenCount: number;
        hasCodeBlock: boolean;
        hasReasoningKeywords: boolean;
        hasStructuredPrompt: boolean;
    };
}

// Inference Request
export interface InferenceRequest {
    prompt: string;
    budget?: number; // USD, optional
    responseMode?: 'short' | 'long';
    organizationId: string;
    userId?: string;
}

// Inference Response
export interface InferenceResponse {
    requestId: string;
    content: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    cost: {
        inputCost: number;
        outputCost: number;
        totalCost: number;
    };
    model: string;
    vendor: Vendor;
    truncated: boolean;
    timestamp: Date;
}

// Budget Status
export interface BudgetStatus {
    allowed: number;
    spent: number;
    remaining: number;
    percentUsed: number;
}

// Organization Config
export interface OrganizationConfig {
    id: string;
    name: string;
    defaultBudget: number;
    allowedVendors: Vendor[];
    createdAt: Date;
    updatedAt: Date;
}