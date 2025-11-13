import Anthropic from '@anthropic-ai/sdk';
import { APIError, APIConnectionError, RateLimitError } from '@anthropic-ai/sdk/error';
import { z } from 'zod';
import {
  withCircuitBreaker,
  withJitteredRetry,
} from '../../../shared/resilience';
import { env } from '../config/env';
import { categoryEnum, contextEnum } from '../schemas/enums';

let anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  timeout: 30000, // 30 seconds
});

type MessageCreateParams = Parameters<Anthropic['messages']['create']>[0];

const buildAnthropicExecutor = () =>
  withCircuitBreaker(
    withJitteredRetry((payload: MessageCreateParams) => anthropic.messages.create(payload), {
      maxRetries: 3,
      baseDelayMs: 750,
      maxDelayMs: 10_000,
      jitterStrategy: 'decorrelated',
    }),
    {
      failureThreshold: 3,
      windowMs: 60_000,
      cooldownMs: 30_000,
    }
  );

let executeAnthropicRequest = buildAnthropicExecutor();

// Export for testing purposes
export const setAnthropicClient = (client: Anthropic) => {
  anthropic = client;
  executeAnthropicRequest = buildAnthropicExecutor();
};

// Zod schemas for validation
const taskEnrichmentSchema = z.object({
  category: categoryEnum,
  context: contextEnum,
  rephrasedName: z.string().min(1),
  definitionOfDone: z.string().min(1),
});

export interface TaskEnrichmentInput {
  rawTaskName: string;
  priority: number;
  duration: number;
  energy: string;
}

export interface TaskEnrichmentOutput {
  category: string;
  context: string;
  rephrasedName: string;
  definitionOfDone: string;
}

function isValidCategory(value: any): boolean {
  return taskEnrichmentSchema.shape.category.safeParse(value).success;
}

function isValidContext(value: any): boolean {
  return taskEnrichmentSchema.shape.context.safeParse(value).success;
}

function validateWithRecovery(data: any, input: TaskEnrichmentInput): TaskEnrichmentOutput {
  const result = taskEnrichmentSchema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  // Partial recovery: use valid fields, fill in defaults for invalid
  const recovered: TaskEnrichmentOutput = {
    category: isValidCategory(data.category) ? data.category : 'PERSONAL',
    context: isValidContext(data.context) ? data.context : 'ANYWHERE',
    rephrasedName:
      typeof data.rephrasedName === 'string' && data.rephrasedName.length > 0
        ? data.rephrasedName
        : input.rawTaskName,
    definitionOfDone:
      typeof data.definitionOfDone === 'string' && data.definitionOfDone.length > 0
        ? data.definitionOfDone
        : 'Task completed as described',
  };

  // Log validation failures for monitoring
  console.warn('[LLM Validation] Partial validation failure:', {
    errors: result.error.issues,
    rawResponse: data,
    recoveredFields: recovered,
  });

  return recovered;
}

export async function enrichTask(
  input: TaskEnrichmentInput
): Promise<TaskEnrichmentOutput> {
  const prompt = `You are enriching a task for a productivity system called Compass.

Task: "${input.rawTaskName}"
Priority: ${input.priority} (1=Must, 2=Should, 3=Could, 4=Maybe)
Duration: ${input.duration} minutes
Energy: ${input.energy}

Please provide:
1. Category (choose ONE from: SCHOOL, MUSIC, FITNESS, GAMING, NUTRITION, HYGIENE, PET, SOCIAL, PERSONAL, ADMIN)
2. Context (choose ONE from: HOME, OFFICE, COMPUTER, PHONE, ERRANDS, ANYWHERE)
3. Rephrased task name in [Verb] + [Object] format (make it action-oriented and clear)
4. Definition of Done (specific, measurable completion criteria - what does "done" look like?)

Respond ONLY with valid JSON in this exact format:
{
  "category": "CATEGORY_NAME",
  "context": "CONTEXT_NAME",
  "rephrasedName": "Action-oriented task name",
  "definitionOfDone": "Specific completion criteria"
}`;

  try {
    const message = await executeAnthropicRequest({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude API');
    }

    // Extract JSON from response (Claude might include markdown code blocks)
    let jsonText = content.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Parse JSON with fallback for malformed responses
    let enrichment;
    try {
      enrichment = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('LLM returned invalid JSON:', jsonText.substring(0, 200));
      console.error('Parse error:', parseError instanceof Error ? parseError.message : parseError);

      // Return fallback enrichment for malformed JSON
      return {
        category: 'PERSONAL',
        context: 'ANYWHERE',
        rephrasedName: input.rawTaskName,
        definitionOfDone: 'Task completed as described',
      };
    }

    // Validate with partial recovery
    return validateWithRecovery(enrichment, input);
  } catch (error: unknown) {
    // Only provide fallback for Anthropic API errors
    if (
      error instanceof APIError ||
      error instanceof APIConnectionError ||
      error instanceof RateLimitError
    ) {
      console.error('Anthropic API error during task enrichment:', error.message);

      // Fallback enrichment if API fails
      return {
        category: 'PERSONAL',
        context: 'ANYWHERE',
        rephrasedName: input.rawTaskName,
        definitionOfDone: 'Task completed as described',
      };
    }

    // Re-throw non-API errors (programming errors, validation failures)
    console.error('Unexpected error enriching task:', error);
    throw error;
  }
}
