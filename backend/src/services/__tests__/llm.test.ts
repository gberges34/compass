// backend/src/services/__tests__/llm.test.ts
import { enrichTask, setAnthropicClient } from '../llm';
import Anthropic from '@anthropic-ai/sdk';
import {
  withCircuitBreaker,
  withJitteredRetry,
} from '../../../../shared/resilience';

jest.mock('../../../../shared/resilience', () => {
  const actual = jest.requireActual('../../../../shared/resilience');
  return {
    ...actual,
    withCircuitBreaker: jest.fn((fn) => fn),
    withJitteredRetry: jest.fn((fn) => fn),
  };
});

describe('enrichTask with Zod validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (withCircuitBreaker as jest.Mock).mockImplementation((fn) => fn);
    (withJitteredRetry as jest.Mock).mockImplementation((fn) => fn);
  });

  it('should validate and return valid LLM response', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: 'SCHOOL',
          context: 'COMPUTER',
          rephrasedName: 'Complete physics homework',
          definitionOfDone: 'All problems solved and checked',
        }),
      }],
    });

    const mockAnthropicClient = {
      messages: { create: mockCreate },
    } as any;

    setAnthropicClient(mockAnthropicClient);

    const result = await enrichTask({
      rawTaskName: 'do physics hw',
      priority: 1,
      duration: 60,
      energy: 'HIGH',
    });

    expect(result).toEqual({
      category: 'SCHOOL',
      context: 'COMPUTER',
      rephrasedName: 'Complete physics homework',
      definitionOfDone: 'All problems solved and checked',
    });
  });

  it('should use partial recovery for invalid category', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: 'INVALID_CATEGORY',
          context: 'COMPUTER',
          rephrasedName: 'Complete physics homework',
          definitionOfDone: 'All problems solved',
        }),
      }],
    });

    const mockAnthropicClient = {
      messages: { create: mockCreate },
    } as any;

    setAnthropicClient(mockAnthropicClient);

    const result = await enrichTask({
      rawTaskName: 'do physics hw',
      priority: 1,
      duration: 60,
      energy: 'HIGH',
    });

    expect(result.category).toBe('PERSONAL');
    expect(result.context).toBe('COMPUTER');
    expect(result.rephrasedName).toBe('Complete physics homework');
    expect(result.definitionOfDone).toBe('All problems solved');
  });

  it('should use partial recovery for multiple invalid fields', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: 'INVALID',
          context: 'INVALID',
          rephrasedName: '',
          definitionOfDone: 'Valid completion criteria',
        }),
      }],
    });

    const mockAnthropicClient = {
      messages: { create: mockCreate },
    } as any;

    setAnthropicClient(mockAnthropicClient);

    const result = await enrichTask({
      rawTaskName: 'original task',
      priority: 2,
      duration: 30,
      energy: 'MEDIUM',
    });

    expect(result.category).toBe('PERSONAL');
    expect(result.context).toBe('ANYWHERE');
    expect(result.rephrasedName).toBe('original task');
    expect(result.definitionOfDone).toBe('Valid completion criteria');
  });
});
