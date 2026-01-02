import type { Category } from '../types';

export type PrimaryCategorySelection = Category | 'OTHER';

export const PRIMARY_CATEGORIES: readonly Category[] = [
  'SCHOOL',
  'MUSIC',
  'FITNESS',
  'GAMING',
  'NUTRITION',
  'HYGIENE',
  'PET',
  'SOCIAL',
  'PERSONAL',
  'ADMIN',
] as const;

export function isPrimaryCategory(value: string): value is Category {
  return (PRIMARY_CATEGORIES as readonly string[]).includes(value);
}

export function parsePlannedBlockLabel(label: string): {
  primary: PrimaryCategorySelection;
  details: string;
} {
  const trimmed = label.trim();
  if (!trimmed) return { primary: 'OTHER', details: '' };

  for (const category of PRIMARY_CATEGORIES) {
    if (trimmed === category) return { primary: category, details: '' };
    const prefix = `${category} - `;
    if (trimmed.startsWith(prefix)) {
      return { primary: category, details: trimmed.slice(prefix.length).trim() };
    }
  }

  return { primary: 'OTHER', details: trimmed };
}

export function buildPlannedBlockLabel(
  primary: PrimaryCategorySelection,
  details: string
): string {
  const trimmedDetails = details.trim();

  if (primary === 'OTHER') return trimmedDetails;
  if (!trimmedDetails) return primary;
  return `${primary} - ${trimmedDetails}`;
}

export function hhmmToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

