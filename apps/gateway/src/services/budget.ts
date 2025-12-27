import { ModelConfig, costCalculator, CostBreakdown } from '@ai-control/shared';

export interface BudgetCheckResult {
  allowed: boolean;
  estimatedMaxTokens: number;
  reason?: string;
}

export class BudgetEnforcer {
  /**
   * Check if request is within budget
   */
  checkBudget(
    inputTokens: number,
    budget: number,
    modelConfig: ModelConfig
  ): BudgetCheckResult {
    // Calculate input cost
    const inputCost = (inputTokens / 1000) * modelConfig.inputCostPer1k;

    // Check if input alone exceeds budget
    if (inputCost >= budget) {
      return {
        allowed: false,
        estimatedMaxTokens: 0,
        reason: 'Input tokens alone exceed budget',
      };
    }

    // Calculate max output tokens within budget
    const maxOutputTokens = costCalculator.estimateMaxOutputTokens(
      inputTokens,
      budget,
      this.getModelKey(modelConfig)
    );

    if (maxOutputTokens < 10) {
      return {
        allowed: false,
        estimatedMaxTokens: 0,
        reason: 'Budget too low for meaningful output',
      };
    }

    return {
      allowed: true,
      estimatedMaxTokens: Math.floor(maxOutputTokens),
    };
  }

  /**
   * Calculate cost for usage
   */
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    modelConfig: ModelConfig
  ): CostBreakdown {
    return costCalculator.calculate(
      inputTokens,
      outputTokens,
      this.getModelKey(modelConfig)
    );
  }

  /**
   * Get model key from config
   */
  private getModelKey(modelConfig: ModelConfig): string {
    // Find the key in MODEL_PRICING that matches this config
    if (modelConfig.model === 'gpt-3.5-turbo') return 'gpt-3.5-turbo';
    if (modelConfig.model.includes('gpt-4-turbo')) return 'gpt-4-turbo';
    if (modelConfig.model.includes('gpt-4')) return 'gpt-4';
    if (modelConfig.model.includes('claude-3-opus')) return 'claude-3-opus';
    if (modelConfig.model.includes('claude-3-sonnet')) return 'claude-3-sonnet';
    if (modelConfig.model.includes('claude-3-haiku')) return 'claude-3-haiku';

    // Default fallback
    return 'gpt-4-turbo';
  }
}