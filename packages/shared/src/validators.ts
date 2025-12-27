import { z } from 'zod';

// Inference Request Schema
export const InferenceRequestSchema = z.object({
    prompt: z.string().min(1, 'Prompt cannot be empty').max(50000, 'Prompt too long'),
    budget: z.number().positive().max(100).optional(), // Max $100 per request
    responseMode: z.enum(['short', 'long']).optional(),
    organizationId: z.string().uuid(),
    userId: z.string().uuid().optional(),
});

export type InferenceRequestInput = z.infer<typeof InferenceRequestSchema>;

// API Key Schema
export const ApiKeySchema = z.string().regex(/^sk-[a-zA-Z0-9]{32,}$/, 'Invalid API key format');

// Organization Config Schema
export const OrganizationConfigSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    defaultBudget: z.number().positive().default(1.0),
    allowedVendors: z.array(z.enum(['openai', 'anthropic'])).default(['openai', 'anthropic']),
    createdAt: z.date(),
    updatedAt: z.date(),
});

// Classifier Output Schema
export const ClassifierResultSchema = z.object({
    score: z.number().int().min(0).max(10),
    complexityClass: z.enum(['low', 'medium', 'high']),
    reasoning: z.array(z.string()),
    metadata: z.object({
        tokenCount: z.number().int(),
        hasCodeBlock: z.boolean(),
        hasReasoningKeywords: z.boolean(),
        hasStructuredPrompt: z.boolean(),
    }),
});

// Usage Schema
export const UsageSchema = z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
});

// Cost Schema
export const CostSchema = z.object({
    inputCost: z.number().nonnegative(),
    outputCost: z.number().nonnegative(),
    totalCost: z.number().nonnegative(),
});

// Inference Response Schema
export const InferenceResponseSchema = z.object({
    requestId: z.string().uuid(),
    content: z.string(),
    usage: UsageSchema,
    cost: CostSchema,
    model: z.string(),
    vendor: z.enum(['openai', 'anthropic']),
    truncated: z.boolean(),
    timestamp: z.date(),
});

export type InferenceResponseOutput = z.infer<typeof InferenceResponseSchema>;

// Error Response Schema
export const ErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string(),
    code: z.string().optional(),
    requestId: z.string().uuid().optional(),
});