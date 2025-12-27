import { encoding_for_model, Tiktoken } from 'tiktoken';

// Model to encoding mapping
const MODEL_ENCODINGS: Record<string, string> = {
    'gpt-4': 'cl100k_base',
    'gpt-4-turbo': 'cl100k_base',
    'gpt-3.5-turbo': 'cl100k_base',
    'claude-3-opus': 'cl100k_base',
    'claude-3-sonnet': 'cl100k_base',
    'claude-3-haiku': 'cl100k_base',
};

export class TokenCounter {
    private encoders: Map<string, Tiktoken> = new Map();

    /**
     * Count tokens in a text string for a specific model
     */
    count(text: string, model: string): number {
        const encoder = this.getEncoder(model);
        const tokens = encoder.encode(text);
        return tokens.length;
    }

    /**
     * Count tokens with overhead (messages format, etc.)
     */
    countWithOverhead(text: string, model: string, overhead: number = 4): number {
        return this.count(text, model) + overhead;
    }

    /**
     * Get or create encoder for a model
     */
    private getEncoder(model: string): Tiktoken {
        if (this.encoders.has(model)) {
            return this.encoders.get(model)!;
        }

        // Try to get model-specific encoding
        try {
            const encoder = encoding_for_model(model as any);
            this.encoders.set(model, encoder);
            return encoder;
        } catch {
            // Fallback to cl100k_base (GPT-4/3.5 encoding)
            const encoder = encoding_for_model('gpt-4' as any);
            this.encoders.set(model, encoder);
            return encoder;
        }
    }

    /**
     * Cleanup encoders
     */
    cleanup(): void {
        this.encoders.forEach(encoder => encoder.free());
        this.encoders.clear();
    }
}

// Singleton instance
export const tokenCounter = new TokenCounter();

/**
 * Quick token count helper
 */
export function countTokens(text: string, model: string = 'gpt-4'): number {
    return tokenCounter.count(text, model);
}