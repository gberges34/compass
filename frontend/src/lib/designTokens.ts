/**
 * Compass Design System Tokens
 * Maps application concepts to design system colors and styles
 */

import { Category } from '../types';

type CategoryConfig = {
  bg: string;
  border: string;
  text: string;
  label: string;
  hex: string;
};

// ---------------------------------------------------------------------------
// Legacy Task Category tokens (enum-like categories)
// ---------------------------------------------------------------------------

// Category color mapping (use pastel accents)
export const categoryColors: Record<Category, CategoryConfig> = {
  SCHOOL: {
    bg: 'bg-sky',
    border: 'border-sky',
    text: 'text-blue-700',
    label: 'Sky Blue',
    hex: '#3b82f6', // For react-big-calendar and charts
  },
  MUSIC: {
    bg: 'bg-lavender',
    border: 'border-lavender',
    text: 'text-purple-700',
    label: 'Lavender',
    hex: '#8b5cf6',
  },
  FITNESS: {
    bg: 'bg-mint',
    border: 'border-mint',
    text: 'text-green-700',
    label: 'Mint',
    hex: '#10b981',
  },
  GAMING: {
    bg: 'bg-blush',
    border: 'border-blush',
    text: 'text-pink-700',
    label: 'Blush',
    hex: '#f59e0b',
  },
  NUTRITION: {
    bg: 'bg-sun',
    border: 'border-sun',
    text: 'text-amber-700',
    label: 'Sun',
    hex: '#14b8a6',
  },
  HYGIENE: {
    bg: 'bg-sky',
    border: 'border-sky',
    text: 'text-blue-700',
    label: 'Sky Blue',
    hex: '#06b6d4',
  },
  PET: {
    bg: 'bg-mint',
    border: 'border-mint',
    text: 'text-green-700',
    label: 'Mint',
    hex: '#ec4899',
  },
  SOCIAL: {
    bg: 'bg-blush',
    border: 'border-blush',
    text: 'text-pink-700',
    label: 'Blush',
    hex: '#f97316',
  },
  PERSONAL: {
    bg: 'bg-lavender',
    border: 'border-lavender',
    text: 'text-purple-700',
    label: 'Lavender',
    hex: '#6366f1',
  },
  ADMIN: {
    bg: 'bg-cloud',
    border: 'border-stone',
    text: 'text-slate',
    label: 'Neutral',
    hex: '#84cc16',
  },
};

export type CategoryAccentToken =
  | 'mint'
  | 'sky'
  | 'lavender'
  | 'blush'
  | 'sun'
  | 'rose'
  | 'peach'
  | 'apricot'
  | 'butter'
  | 'lime'
  | 'pistachio'
  | 'leaf'
  | 'spearmint'
  | 'jade'
  | 'aqua'
  | 'glacier'
  | 'ice'
  | 'azure'
  | 'periwinkle'
  | 'iris'
  | 'lilac'
  | 'orchid'
  | 'mauve'
  | 'pink'
  | 'petal';

export const CATEGORY_ACCENT_TOKENS: readonly CategoryAccentToken[] = [
  'mint',
  'sky',
  'lavender',
  'blush',
  'sun',
  'rose',
  'peach',
  'apricot',
  'butter',
  'lime',
  'pistachio',
  'leaf',
  'spearmint',
  'jade',
  'aqua',
  'glacier',
  'ice',
  'azure',
  'periwinkle',
  'iris',
  'lilac',
  'orchid',
  'mauve',
  'pink',
  'petal',
] as const;

export const categoryAccentTokenConfig: Record<CategoryAccentToken, CategoryConfig> = {
  mint: { bg: 'bg-mint', border: 'border-mint', text: 'text-ink', label: 'Mint', hex: '#C9F0DE' },
  sky: { bg: 'bg-sky', border: 'border-sky', text: 'text-ink', label: 'Sky', hex: '#CFE9FF' },
  lavender: { bg: 'bg-lavender', border: 'border-lavender', text: 'text-ink', label: 'Lavender', hex: '#E1D9FF' },
  blush: { bg: 'bg-blush', border: 'border-blush', text: 'text-ink', label: 'Blush', hex: '#FFDDE6' },
  sun: { bg: 'bg-sun', border: 'border-sun', text: 'text-ink', label: 'Sun', hex: '#FFEFC6' },
  rose: { bg: 'bg-rose', border: 'border-rose', text: 'text-ink', label: 'Rose', hex: '#F4AFAF' },
  peach: { bg: 'bg-peach', border: 'border-peach', text: 'text-ink', label: 'Peach', hex: '#F4D1C2' },
  apricot: { bg: 'bg-apricot', border: 'border-apricot', text: 'text-ink', label: 'Apricot', hex: '#F7DDB6' },
  butter: { bg: 'bg-butter', border: 'border-butter', text: 'text-ink', label: 'Butter', hex: '#F4F0CD' },
  lime: { bg: 'bg-lime', border: 'border-lime', text: 'text-ink', label: 'Lime', hex: '#E6F4AF' },
  pistachio: { bg: 'bg-pistachio', border: 'border-pistachio', text: 'text-ink', label: 'Pistachio', hex: '#DBF4C2' },
  leaf: { bg: 'bg-leaf', border: 'border-leaf', text: 'text-ink', label: 'Leaf', hex: '#C3F7B6' },
  spearmint: { bg: 'bg-spearmint', border: 'border-spearmint', text: 'text-ink', label: 'Spearmint', hex: '#CDF4D0' },
  jade: { bg: 'bg-jade', border: 'border-jade', text: 'text-ink', label: 'Jade', hex: '#AFF4CA' },
  aqua: { bg: 'bg-aqua', border: 'border-aqua', text: 'text-ink', label: 'Aqua', hex: '#C2F4E5' },
  glacier: { bg: 'bg-glacier', border: 'border-glacier', text: 'text-ink', label: 'Glacier', hex: '#B6F7F7' },
  ice: { bg: 'bg-ice', border: 'border-ice', text: 'text-ink', label: 'Ice', hex: '#CDE8F4' },
  azure: { bg: 'bg-azure', border: 'border-azure', text: 'text-ink', label: 'Azure', hex: '#AFCAF4' },
  periwinkle: { bg: 'bg-periwinkle', border: 'border-periwinkle', text: 'text-ink', label: 'Periwinkle', hex: '#C2C7F4' },
  iris: { bg: 'bg-iris', border: 'border-iris', text: 'text-ink', label: 'Iris', hex: '#C3B6F7' },
  lilac: { bg: 'bg-lilac', border: 'border-lilac', text: 'text-ink', label: 'Lilac', hex: '#E0CDF4' },
  orchid: { bg: 'bg-orchid', border: 'border-orchid', text: 'text-ink', label: 'Orchid', hex: '#E6AFF4' },
  mauve: { bg: 'bg-mauve', border: 'border-mauve', text: 'text-ink', label: 'Mauve', hex: '#F4C2EF' },
  pink: { bg: 'bg-pink', border: 'border-pink', text: 'text-ink', label: 'Pink', hex: '#F7B6DD' },
  petal: { bg: 'bg-petal', border: 'border-petal', text: 'text-ink', label: 'Petal', hex: '#F4CDD8' },
};

export function isCategoryAccentToken(value: string): value is CategoryAccentToken {
  return (CATEGORY_ACCENT_TOKENS as readonly string[]).includes(value);
}

export function getCategoryAccentTokenConfig(token: string): CategoryConfig {
  if (isCategoryAccentToken(token)) return categoryAccentTokenConfig[token];
  return categoryAccentTokenConfig.sky;
}

// ---------------------------------------------------------------------------
// Time Engine (Daily Activity Clock) colors
// Activities are user-defined strings, so we:
// - apply a small set of semantic keyword rules for common activities
// - fall back to a deterministic palette (stable per activity label)
//
// Palette is constrained to CompassVisualDesignGuidelines.md tokens.
// ---------------------------------------------------------------------------

export const timeEngineColors = {
  // Neutrals
  snow: '#FCFCFD',
  cloud: '#F6F7F9',
  fog: '#EEF0F3',
  stone: '#D7DBE0',
  slate: '#8A94A6',
  ink: '#0F172A',

  // Pastel accents (categorical palette)
  mint: '#C9F0DE',
  sky: '#CFE9FF',
  lavender: '#E1D9FF',
  blush: '#FFDDE6',
  sun: '#FFEFC6',

  // Action colors (kept for possible future use; not used as categorical fills)
  action: '#2A6FF2',
  success: '#22C55E',
  warn: '#F59E0B',
  danger: '#EF4444',
} as const;

export const activityColors = {
  // Derived gaps between slices (not a real activity category)
  untracked: timeEngineColors.fog,
} as const;

function normalizeActivityLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-') // normalize various dashes
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stableHash32(input: string): number {
  // Simple, deterministic string hash (FNV-1a 32-bit)
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const categoricalPalette = [
  timeEngineColors.sky,
  timeEngineColors.lavender,
  timeEngineColors.mint,
  timeEngineColors.blush,
  timeEngineColors.sun,
] as const;

const semanticRules: Array<{ test: RegExp; color: string }> = [
  // Rest / recovery
  { test: /\b(sleep|nap|rest|wind\s*down|relax|recovery)\b/i, color: timeEngineColors.lavender },

  // Food
  { test: /\b(meal|eat|eating|breakfast|lunch|dinner|cook|cooking)\b/i, color: timeEngineColors.sun },

  // Exercise / movement (excluding commute-y words handled below)
  { test: /\b(workout|exercise|gym|run|walk|walking|lift|lifting|yoga|sauna|hike)\b/i, color: timeEngineColors.mint },

  // Travel / commute (keep this after exercise so "walk" doesn't steal "evening walk" away from movement)
  { test: /\b(commute|drive|driving|train|bus|travel|flight)\b/i, color: timeEngineColors.sky },

  // Focus / work
  { test: /\b(coding|code|project|planning|build|sprint|meeting)\b/i, color: timeEngineColors.sky },

  // Social / play
  { test: /\b(gaming|game|play|date\s*night|family|friends|discord|call)\b/i, color: timeEngineColors.blush },

  // Admin / chores
  { test: /\b(admin|chores?|errands?|cleanup|house)\b/i, color: timeEngineColors.stone },
];

export function getActivityColor(activity: string): string {
  const normalized = normalizeActivityLabel(activity);
  if (!normalized) return timeEngineColors.stone;

  for (const rule of semanticRules) {
    if (rule.test.test(normalized)) return rule.color;
  }

  const idx = stableHash32(normalized) % categoricalPalette.length;
  return categoricalPalette[idx];
}

// Priority color mapping (maintain existing color associations)
export const priorityColors = {
  MUST: {
    bg: 'bg-danger/10',
    border: 'border-danger/30',
    text: 'text-danger',
    label: 'Must',
  },
  SHOULD: {
    bg: 'bg-warn/10',
    border: 'border-warn/30',
    text: 'text-warn',
    label: 'Should',
  },
  COULD: {
    bg: 'bg-sun',
    border: 'border-sun',
    text: 'text-amber-700',
    label: 'Could',
  },
  MAYBE: {
    bg: 'bg-cloud',
    border: 'border-stone',
    text: 'text-slate',
    label: 'Maybe',
  },
};

// Energy level mapping
export const energyColors = {
  HIGH: {
    bg: 'bg-mint',
    border: 'border-mint',
    text: 'text-green-700',
    label: 'High Energy',
    icon: '⚡',
  },
  MEDIUM: {
    bg: 'bg-sun',
    border: 'border-sun',
    text: 'text-amber-700',
    label: 'Medium Energy',
    icon: '☀️',
  },
  LOW: {
    bg: 'bg-blush',
    border: 'border-blush',
    text: 'text-pink-700',
    label: 'Low Energy',
    icon: '🌙',
  },
};

// Task status mapping
export const statusColors = {
  ACTIVE: {
    bg: 'bg-mint',
    border: 'border-mint',
    text: 'text-green-700',
    label: 'Active',
  },
  NEXT: {
    bg: 'bg-sky',
    border: 'border-sky',
    text: 'text-blue-700',
    label: 'Next',
  },
  SOMEDAY: {
    bg: 'bg-cloud',
    border: 'border-stone',
    text: 'text-slate',
    label: 'Someday',
  },
  DONE: {
    bg: 'bg-fog',
    border: 'border-stone',
    text: 'text-slate',
    label: 'Done',
  },
};

// Energy match mapping
export const energyMatchColors = {
  PERFECT: {
    bg: 'bg-mint',
    border: 'border-mint',
    text: 'text-green-700',
    label: 'Perfect Match',
    icon: '🎯',
  },
  MOSTLY_ALIGNED: {
    bg: 'bg-sky',
    border: 'border-sky',
    text: 'text-blue-700',
    label: 'Mostly Aligned',
    icon: '👍',
  },
  SOME_MISMATCH: {
    bg: 'bg-sun',
    border: 'border-sun',
    text: 'text-amber-700',
    label: 'Some Mismatch',
    icon: '⚠️',
  },
  POOR: {
    bg: 'bg-blush',
    border: 'border-blush',
    text: 'text-pink-700',
    label: 'Poor Match',
    icon: '❌',
  },
};

// Utility function to get category styling
export const getCategoryStyle = (category: keyof typeof categoryColors) => {
  return categoryColors[category] || categoryColors.ADMIN;
};

// Utility function to get priority styling
export const getPriorityStyle = (priority: keyof typeof priorityColors) => {
  return priorityColors[priority] || priorityColors.MAYBE;
};

// Utility function to get energy styling
export const getEnergyStyle = (energy: keyof typeof energyColors) => {
  return energyColors[energy] || energyColors.MEDIUM;
};

// Utility function to get status styling
export const getStatusStyle = (status: keyof typeof statusColors) => {
  return statusColors[status] || statusColors.NEXT;
};

// Utility function to get energy match styling
export const getEnergyMatchStyle = (match: keyof typeof energyMatchColors) => {
  return energyMatchColors[match] || energyMatchColors.MOSTLY_ALIGNED;
};
