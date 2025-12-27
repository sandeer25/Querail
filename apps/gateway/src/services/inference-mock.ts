import { ModelConfig, countTokens } from '@ai-control/shared';

export interface InferenceResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  truncated: boolean;
}

export class InferenceService {
  /**
   * Mock inference - returns fake responses
   */
  async infer(
    prompt: string,
    modelConfig: ModelConfig,
    maxOutputTokens?: number
  ): Promise<InferenceResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const inputTokens = countTokens(prompt, modelConfig.model);

    // Generate mock response based on prompt
    let content = '';
    
    if (prompt.toLowerCase().includes('code')) {
      content = 'Here is a sample code solution:\n\n```javascript\nfunction example() {\n  return "Hello World";\n}\n```\n\nThis demonstrates the basic structure.';
    } else if (prompt.toLowerCase().includes('explain')) {
      content = 'Let me explain this concept step by step:\n\n1. First, understand the basic principle\n2. Then, apply it to your specific case\n3. Finally, verify the results\n\nThis approach ensures comprehensive understanding.';
    } else {
      content = `I understand your question about: "${prompt.substring(0, 50)}..."\n\nBased on the complexity of your query (${modelConfig.tier} tier), here's a detailed response that addresses your needs. This is a mock response for development purposes.`;
    }

    const outputTokens = countTokens(content, modelConfig.model);
    const totalTokens = inputTokens + outputTokens;

    // Simulate truncation if over max tokens
    const truncated = maxOutputTokens ? outputTokens > maxOutputTokens : false;

    return {
      content: truncated ? content.substring(0, maxOutputTokens! * 4) + '...' : content,
      inputTokens,
      outputTokens: truncated ? maxOutputTokens! : outputTokens,
      totalTokens: truncated ? inputTokens + maxOutputTokens! : totalTokens,
      truncated,
    };
  }
}