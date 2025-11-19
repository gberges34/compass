import Anthropic from '@anthropic-ai/sdk';
import { APIError, APIConnectionError, RateLimitError } from '@anthropic-ai/sdk/error';
import { z } from 'zod';
import { withRetry } from '../utils/retry';
import { env } from '../config/env';
import { categoryEnum, contextEnum } from '../schemas/enums';
import { InternalError } from '../errors/AppError';

let anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  timeout: 30000, // 30 seconds
});

// Export for testing purposes
export const setAnthropicClient = (client: Anthropic) => {
  anthropic = client;
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

function validateEnrichment(data: any): TaskEnrichmentOutput {
  const result = taskEnrichmentSchema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  // Log validation failures for monitoring
  console.error('[LLM Validation] Validation failure:', {
    errors: result.error.issues,
    rawResponse: data,
  });

  throw new InternalError(
    `LLM enrichment validation failed: ${result.error.issues.map((i) => i.message).join(', ')}`
  );
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
    const message = await withRetry(() =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
    );

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

    // Parse JSON - throw error if malformed
    let enrichment;
    try {
      enrichment = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('LLM returned invalid JSON:', jsonText.substring(0, 200));
      console.error('Parse error:', parseError instanceof Error ? parseError.message : parseError);

      throw new InternalError(
        `Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`
      );
    }

    // Validate enrichment - throws error if validation fails
    return validateEnrichment(enrichment);
  } catch (error: unknown) {
    // If it's already an InternalError (from validation/parsing), re-throw it
    if (error instanceof InternalError) {
      throw error;
    }

    // Handle Anthropic API errors - throw instead of silent fallback
    if (
      error instanceof APIError ||
      error instanceof APIConnectionError ||
      error instanceof RateLimitError
    ) {
      console.error('Anthropic API error during task enrichment:', error.message);
      throw new InternalError(
        `LLM enrichment failed: ${error.message}. Please categorize manually.`
      );
    }

    // Re-throw any other errors (programming errors, etc.)
    console.error('Unexpected error enriching task:', error);
    throw error;
  }
}
