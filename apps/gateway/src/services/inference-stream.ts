import OpenAI from "openai";
import { ModelConfig, countTokens } from "@ai-control/shared";
import { config } from "../config";

export interface StreamChunk {
  content: string;
  delta: string;
  finishReason: string | null;
}

export interface StreamResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  truncated: boolean;
}

export class InferenceStreamService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  /**
   * Stream inference from OpenAI
   */
  async *streamInference(
    prompt: string,
    modelConfig: ModelConfig,
    maxOutputTokens?: number
  ): AsyncGenerator<StreamChunk, StreamResult, undefined> {
    if (modelConfig.vendor !== "openai") {
      throw new Error(
        `Streaming not yet supported for vendor: ${modelConfig.vendor}`
      );
    }

    const inputTokens = countTokens(prompt, modelConfig.model);
    let fullContent = "";
    let finishReason: string | null = null;

    const stream = await this.openai.chat.completions.create({
      model: modelConfig.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxOutputTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      finishReason = chunk.choices[0]?.finish_reason || null;

      if (delta) {
        fullContent += delta;
        yield {
          content: fullContent,
          delta,
          finishReason,
        };
      }
    }

    const outputTokens = countTokens(fullContent, modelConfig.model);
    const totalTokens = inputTokens + outputTokens;
    const truncated = finishReason === "length";

    return {
      content: fullContent,
      inputTokens,
      outputTokens,
      totalTokens,
      truncated,
    };
  }

  /**
   * Non-streaming inference (for backward compatibility)
   */
  async infer(
    prompt: string,
    modelConfig: ModelConfig,
    maxOutputTokens?: number
  ) {
    const inputTokens = countTokens(prompt, modelConfig.model);

    const completion = await this.openai.chat.completions.create({
      model: modelConfig.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxOutputTokens,
    });

    const content = completion.choices[0]?.message?.content || "";
    const usage = completion.usage;

    const outputTokens =
      usage?.completion_tokens || countTokens(content, modelConfig.model);
    const totalTokens = usage?.total_tokens || inputTokens + outputTokens;

    const truncated = completion.choices[0]?.finish_reason === "length";

    return {
      content,
      inputTokens: usage?.prompt_tokens || inputTokens,
      outputTokens,
      totalTokens,
      truncated,
    };
  }
}
