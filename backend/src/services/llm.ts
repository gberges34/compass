import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
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

    const enrichment = JSON.parse(jsonText) as TaskEnrichmentOutput;

    // Validate the response has all required fields
    if (!enrichment.category || !enrichment.context || !enrichment.rephrasedName || !enrichment.definitionOfDone) {
      throw new Error('Invalid enrichment response: missing required fields');
    }

    return enrichment;
  } catch (error: any) {
    console.error('Error enriching task:', error);

    // Fallback enrichment if API fails
    return {
      category: 'PERSONAL',
      context: 'ANYWHERE',
      rephrasedName: input.rawTaskName,
      definitionOfDone: 'Task completed as described'
    };
  }
}

// Helper function to extract structured data from voice input using LLM
export async function structureVoiceInput(
  voiceText: string,
  context: 'orient-blocks' | 'outcomes' | 'reflection' | 'wins-misses-lessons'
): Promise<any> {
  let prompt = '';

  switch (context) {
    case 'orient-blocks':
      prompt = `Extract time blocks from this voice input: "${voiceText}"

Return JSON with this structure:
{
  "blocks": [
    {"type": "deep_work", "start": "9:00 AM", "end": "10:30 AM", "focus": "Physics homework"},
    {"type": "admin", "start": "2:00 PM", "end": "3:00 PM"}
  ]
}`;
      break;

    case 'outcomes':
      prompt = `Extract up to 3 key outcomes from this voice input: "${voiceText}"

Return JSON array of outcomes (max 3):
["Outcome 1", "Outcome 2", "Outcome 3"]`;
      break;

    case 'reflection':
      prompt = `Structure this reflection into clear, concise points: "${voiceText}"

Return a structured reflection as a single paragraph.`;
      break;

    case 'wins-misses-lessons':
      prompt = `Extract wins, misses, and lessons from this input: "${voiceText}"

Return JSON:
{
  "items": ["Item 1", "Item 2", "Item 3"]
}`;
      break;
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude API');
    }

    let jsonText = content.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error('Error structuring voice input:', error);
    // Return raw text as fallback
    return context === 'outcomes' ? [voiceText] : { text: voiceText };
  }
}
