import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import { InferenceRequestSchema } from "@ai-control/shared";
import { DeterministicClassifier } from "../services/classifier";
import { ModelRouter } from "../services/router";
import { InferenceStreamService } from "../services/inference-stream";
import { BudgetEnforcer } from "../services/budget";
import {
  getDatabase,
  OrganizationsRepository,
  InferenceRequestsRepository,
} from "@ai-control/database";
import { randomUUID } from "crypto";

export async function inferStreamRoutes(fastify: FastifyInstance) {
  const classifier = new DeterministicClassifier();
  const router = new ModelRouter();
  const inferenceService = new InferenceStreamService();
  const budgetEnforcer = new BudgetEnforcer();

  fastify.post(
    "/v1/infer/stream",
    { preHandler: authMiddleware },
    async (request: AuthenticatedRequest, reply) => {
      const requestId = randomUUID();

      try {
        // Parse and validate request body
        const body = InferenceRequestSchema.parse({
          ...(request.body as any),
          organizationId: request.organizationId,
        });

        const db = getDatabase();
        const orgsRepo = new OrganizationsRepository(db);
        const inferenceRepo = new InferenceRequestsRepository(db);

        // Get organization config
        const org = await orgsRepo.findById(body.organizationId);
        if (!org) {
          return reply.code(404).send({
            error: "Not Found",
            message: "Organization not found",
            requestId,
          });
        }

        // Determine budget
        const budget = body.budget || org.defaultBudget;

        // Step 1: Classify prompt
        const classifierResult = classifier.classify(body.prompt);

        // Step 2: Route to model
        const modelConfig = router.route(classifierResult.complexityClass);

        // Step 3: Check budget
        const budgetCheck = budgetEnforcer.checkBudget(
          classifierResult.metadata.tokenCount,
          budget,
          modelConfig
        );

        if (!budgetCheck.allowed) {
          return reply.code(400).send({
            error: "Budget Exceeded",
            message: budgetCheck.reason,
            requestId,
          });
        }

        // Set up SSE headers
        reply.raw.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Request-Id": requestId,
        });

        // Send initial metadata
        const metadata = {
          requestId,
          model: modelConfig.model,
          vendor: modelConfig.vendor,
          complexityClass: classifierResult.complexityClass,
          estimatedMaxTokens: budgetCheck.estimatedMaxTokens,
        };

        reply.raw.write(`event: metadata\n`);
        reply.raw.write(`data: ${JSON.stringify(metadata)}\n\n`);

        // Stream the inference
        const stream = inferenceService.streamInference(
          body.prompt,
          modelConfig,
          budgetCheck.estimatedMaxTokens
        );

        let lastChunk: any;

        for await (const chunk of stream) {
          lastChunk = chunk;

          // Send content chunk
          reply.raw.write(`event: chunk\n`);
          reply.raw.write(
            `data: ${JSON.stringify({ delta: chunk.delta })}\n\n`
          );
        }

        // Get final result from generator
        const finalResult = lastChunk;

        // Calculate actual cost
        const cost = budgetEnforcer.calculateCost(
          finalResult.inputTokens,
          finalResult.outputTokens,
          modelConfig
        );

        // Send completion event
        const completion = {
          usage: {
            inputTokens: finalResult.inputTokens,
            outputTokens: finalResult.outputTokens,
            totalTokens: finalResult.totalTokens,
          },
          cost: {
            inputCost: cost.inputCost,
            outputCost: cost.outputCost,
            totalCost: cost.totalCost,
          },
          truncated: finalResult.truncated,
          timestamp: new Date().toISOString(),
        };

        reply.raw.write(`event: done\n`);
        reply.raw.write(`data: ${JSON.stringify(completion)}\n\n`);

        // Log to database (async)
        inferenceRepo
          .create({
            organizationId: body.organizationId,
            userId: body.userId,
            prompt: body.prompt,
            budgetRequested: budget,
            complexityScore: classifierResult.score,
            complexityClass: classifierResult.complexityClass,
            hasCodeBlock: classifierResult.metadata.hasCodeBlock,
            hasReasoningKeywords:
              classifierResult.metadata.hasReasoningKeywords,
            hasStructuredPrompt: classifierResult.metadata.hasStructuredPrompt,
            modelSelected: modelConfig.model,
            vendor: modelConfig.vendor,
            inputTokens: finalResult.inputTokens,
            outputTokens: finalResult.outputTokens,
            totalTokens: finalResult.totalTokens,
            inputCost: cost.inputCost,
            outputCost: cost.outputCost,
            totalCost: cost.totalCost,
            truncated: finalResult.truncated,
          })
          .catch((err) => {
            console.error("Failed to log inference request:", err);
          });

        reply.raw.end();
      } catch (error: any) {
        console.error("Streaming inference error:", error);

        // Send error event
        reply.raw.write(`event: error\n`);
        reply.raw.write(
          `data: ${JSON.stringify({
            error: "Internal Server Error",
            message: error.message || "An unexpected error occurred",
            requestId,
          })}\n\n`
        );

        reply.raw.end();
      }
    }
  );
}
