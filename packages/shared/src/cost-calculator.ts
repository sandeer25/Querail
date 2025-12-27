import { ModelConfig } from './types';

// Model pricing (as of Dec 2024)
export const MODEL_PRICING: Record<string, ModelConfig> = {
    // OpenAI
    'gpt-4-turbo': {
        vendor: 'openai',
        model: 'gpt-4-turbo-preview',
        tier: 'high',
        inputCostPer1k: 0.01,
        outputCostPer1k: 0.03,
    },
    'gpt-4': {
        vendor: 'openai',
        model: 'gpt-4',
        tier: 'high',
        inputCostPer1k: 0.03,
        outputCostPer1k: 0.06,
    },
    'gpt-3.5-turbo': {
        vendor: 'openai',
        model: 'gpt-3.5-turbo',
        tier: 'low',
        inputCostPer1k: 0.0005,
        outputCostPer1k: 0.0015,
    },

    // Anthropic
    'claude-3-opus': {
        vendor: 'anthropic',
        model: 'claude-3-opus-20240229',
        tier: 'high',
        inputCostPer1k: 0.015,
        outputCostPer1k: 0.075,
    },
    'claude-3-sonnet': {
        vendor: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        tier: 'medium',
        inputCostPer1k: 0.003,
        outputCostPer1k: 0.015,
    },
    'claude-3-haiku': {
        vendor: 'anthropic',
        model: 'claude-3-haiku-20240307',
        tier: 'low',
        inputCostPer1k: 0.00025,
        outputCostPer1k: 0.00125,
    },
};

export interface CostBreakdown {
    inputCost: number;
    outputCost: number;
    totalCost: number;
}

export class CostCalculator {
    /**
     * Calculate cost for given token usage
     */
    calculate(
        inputTokens: number,
        outputTokens: number,
        modelKey: string
    ): CostBreakdown {
        const pricing = MODEL_PRICING[modelKey];

        if (!pricing) {
            throw new Error(`Unknown model: ${modelKey}`);
        }

        const inputCost = (inputTokens / 1000) * pricing.inputCostPer1k;
        const outputCost = (outputTokens / 1000) * pricing.outputCostPer1k;
        const totalCost = inputCost + outputCost;

        return {
            inputCost: this.round(inputCost),
            outputCost: this.round(outputCost),
            totalCost: this.round(totalCost),
        };
    }

    /**
     * Estimate max output tokens within budget
     */
    estimateMaxOutputTokens(
        inputTokens: number,
        budget: number,
        modelKey: string
    ): number {
        const pricing = MODEL_PRICING[modelKey];

        if (!pricing) {
            throw new Error(`Unknown model: ${modelKey}`);
        }

        // Calculate input cost
        const inputCost = (inputTokens / 1000) * pricing.inputCostPer1k;

        // Remaining budget for output
        const remainingBudget = Math.max(0, budget - inputCost);

        // Calculate max output tokens
        const maxOutputTokens = (remainingBudget / pricing.outputCostPer1k) * 1000;

        return Math.floor(maxOutputTokens);
    }

    /**
     * Get model config by key
     */
    getModelConfig(modelKey: string): ModelConfig | undefined {
        return MODEL_PRICING[modelKey];
    }

    /**
     * Get all models for a vendor
     */
    getModelsByVendor(vendor: 'openai' | 'anthropic'): ModelConfig[] {
        return Object.values(MODEL_PRICING).filter(m => m.vendor === vendor);
    }

    /**
     * Round to 6 decimal places
     */
    private round(value: number): number {
        return Math.round(value * 1000000) / 1000000;
    }
}

// Singleton instance
export const costCalculator = new CostCalculator();