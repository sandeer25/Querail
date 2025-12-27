import OpenAI from "openai";
import { ModelConfig, countTokens } from "@ai-control/shared";
import { config } from "../config";

export interface InferenceResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  truncated: boolean;
}

export class InferenceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  /**
   * Call vendor API based on model config
   */
  async infer(
    prompt: string,
    modelConfig: ModelConfig,
    maxOutputTokens?: number
  ): Promise<InferenceResult> {
    if (modelConfig.vendor === "openai") {
      return this.inferOpenAI(prompt, modelConfig, maxOutputTokens);
    } else {
      throw new Error(
        `Vendor ${modelConfig.vendor} not supported in MVP. Only OpenAI is supported.`
      );
    }
  }

  /**
   * Call OpenAI API
   */
  private async inferOpenAI(
    prompt: string,
    modelConfig: ModelConfig,
    maxOutputTokens?: number
  ): Promise<InferenceResult> {
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
