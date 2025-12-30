import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import { InferenceRequestSchema } from "@ai-control/shared";
import { DeterministicClassifier } from "../services/classifier";
import { ModelRouter } from "../services/router";
// import { InferenceService } from '../services/inference';
import { InferenceService } from "../services/inference-mock";
import { BudgetEnforcer } from "../services/budget";
import {
  getDatabase,
  OrganizationsRepository,
  InferenceRequestsRepository,
} from "@ai-control/database";
import { randomUUID } from "crypto";

export async function inferRoutes(fastify: FastifyInstance) {
  const classifier = new DeterministicClassifier();
  const router = new ModelRouter();
  const inferenceService = new InferenceService();
  const budgetEnforcer = new BudgetEnforcer();

  fastify.post(
    "/v1/infer",
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

        // Step 4: Call inference API
        const inferenceResult = await inferenceService.infer(
          body.prompt,
          modelConfig,
          budgetCheck.estimatedMaxTokens
        );

        // Step 5: Calculate actual cost
        const cost = budgetEnforcer.calculateCost(
          inferenceResult.inputTokens,
          inferenceResult.outputTokens,
          modelConfig
        );

        // Step 6: Log to database (async)
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
            inputTokens: inferenceResult.inputTokens,
            outputTokens: inferenceResult.outputTokens,
            totalTokens: inferenceResult.totalTokens,
            inputCost: cost.inputCost,
            outputCost: cost.outputCost,
            totalCost: cost.totalCost,
            truncated: inferenceResult.truncated,
          })
          .catch((err) => {
            console.error("Failed to log inference request:", err);
          });

        // Step 7: Return response
        return reply.code(200).send({
          requestId,
          content: inferenceResult.content,
          usage: {
            inputTokens: inferenceResult.inputTokens,
            outputTokens: inferenceResult.outputTokens,
            totalTokens: inferenceResult.totalTokens,
          },
          cost: {
            inputCost: cost.inputCost,
            outputCost: cost.outputCost,
            totalCost: cost.totalCost,
          },
          model: modelConfig.model,
          vendor: modelConfig.vendor,
          truncated: inferenceResult.truncated,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error("Inference error:", error);

        if (error.name === "ZodError") {
          return reply.code(400).send({
            error: "Bad Request",
            message: "Invalid request body",
            details: error.errors,
            requestId,
          });
        }

        return reply.code(500).send({
          error: "Internal Server Error",
          message: error.message || "An unexpected error occurred",
          requestId,
        });
      }
    }
  );
}
