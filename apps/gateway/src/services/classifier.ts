import { ClassifierResult, ComplexityClass, countTokens } from '@ai-control/shared';

export class DeterministicClassifier {
  /**
   * Classify prompt complexity using deterministic rules
   */
  classify(prompt: string): ClassifierResult {
    let score = 0;
    const reasoning: string[] = [];
    
    // Count tokens
    const tokenCount = countTokens(prompt);
    
    // Rule 1: Token length
    if (tokenCount > 2000) {
      score += 3;
      reasoning.push('Very long prompt (>2000 tokens)');
    } else if (tokenCount > 800) {
      score += 2;
      reasoning.push('Long prompt (>800 tokens)');
    } else if (tokenCount > 300) {
      score += 1;
      reasoning.push('Medium prompt (>300 tokens)');
    }
    
    // Rule 2: Code blocks
    const hasCodeBlock = /```[\s\S]*?```/.test(prompt);
    if (hasCodeBlock) {
      score += 2;
      reasoning.push('Contains code blocks');
    }
    
    // Rule 3: Reasoning keywords
    const reasoningKeywords = [
      'prove', 'derive', 'explain', 'analyze', 'calculate',
      'step by step', 'think through', 'reasoning', 'logic',
      'demonstrate', 'justify', 'argue', 'compare'
    ];
    
    const hasReasoningKeywords = reasoningKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword)
    );
    
    if (hasReasoningKeywords) {
      score += 2;
      reasoning.push('Contains reasoning keywords');
    }
    
    // Rule 4: Structured prompts
    const hasStructuredPrompt = 
      /\d+\./g.test(prompt) || // Numbered lists
      /^[-*]\s/gm.test(prompt) || // Bullet points
      /step \d+/gi.test(prompt); // Step references
    
    if (hasStructuredPrompt) {
      score += 1;
      reasoning.push('Contains structured elements');
    }
    
    // Determine complexity class
    let complexityClass: ComplexityClass;
    if (score <= 2) {
      complexityClass = 'low';
    } else if (score <= 5) {
      complexityClass = 'medium';
    } else {
      complexityClass = 'high';
    }
    
    return {
      score,
      complexityClass,
      reasoning,
      metadata: {
        tokenCount,
        hasCodeBlock,
        hasReasoningKeywords,
        hasStructuredPrompt,
      },
    };
  }
}