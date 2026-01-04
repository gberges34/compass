import { z } from 'zod';

// Task-related enums
export const priorityEnum = z.enum(['MUST', 'SHOULD', 'COULD', 'MAYBE']);
export const statusEnum = z.enum(['NEXT', 'WAITING', 'ACTIVE', 'DONE', 'SOMEDAY']);
export const contextEnum = z.enum(['HOME', 'OFFICE', 'COMPUTER', 'PHONE', 'ERRANDS', 'ANYWHERE']);
export const energyEnum = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export const effortEnum = z.enum(['SMALL', 'MEDIUM', 'LARGE']);

// Orient-related enums
export const energyMatchEnum = z.enum(['PERFECT', 'MOSTLY_ALIGNED', 'SOME_MISMATCH', 'POOR']);

// Review-related enums
export const reviewTypeEnum = z.enum(['DAILY', 'WEEKLY']);
