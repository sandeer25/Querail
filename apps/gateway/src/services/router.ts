import { ComplexityClass, ModelConfig, MODEL_PRICING } from '@ai-control/shared';

export class ModelRouter {
  /**
   * Route to appropriate model based on complexity
   */
  route(complexityClass: ComplexityClass): ModelConfig {
    const routing: Record<ComplexityClass, string> = {
      low: 'gpt-3.5-turbo',
      medium: 'gpt-4-turbo',
      high: 'gpt-4-turbo',
    };

    const modelKey = routing[complexityClass];
    const modelConfig = MODEL_PRICING[modelKey];

    if (!modelConfig) {
      throw new Error(`Model configuration not found for: ${modelKey}`);
    }

    return modelConfig;
  }

  /**
   * Get model config by key
   */
  getModelConfig(modelKey: string): ModelConfig {
    const config = MODEL_PRICING[modelKey];
    if (!config) {
      throw new Error(`Model configuration not found for: ${modelKey}`);
    }
    return config;
  }
}