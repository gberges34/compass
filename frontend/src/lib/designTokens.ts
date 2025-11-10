/**
 * Compass Design System Tokens
 * Maps application concepts to design system colors and styles
 */

// Category color mapping (use pastel accents)
export const categoryColors = {
  SCHOOL: {
    bg: 'bg-sky',
    border: 'border-sky',
    text: 'text-blue-700',
    label: 'Sky Blue',
  },
  MUSIC: {
    bg: 'bg-lavender',
    border: 'border-lavender',
    text: 'text-purple-700',
    label: 'Lavender',
  },
  FITNESS: {
    bg: 'bg-mint',
    border: 'border-mint',
    text: 'text-green-700',
    label: 'Mint',
  },
  GAMING: {
    bg: 'bg-blush',
    border: 'border-blush',
    text: 'text-pink-700',
    label: 'Blush',
  },
  NUTRITION: {
    bg: 'bg-sun',
    border: 'border-sun',
    text: 'text-amber-700',
    label: 'Sun',
  },
  HYGIENE: {
    bg: 'bg-sky',
    border: 'border-sky',
    text: 'text-blue-700',
    label: 'Sky Blue',
  },
  PET: {
    bg: 'bg-mint',
    border: 'border-mint',
    text: 'text-green-700',
    label: 'Mint',
  },
  SOCIAL: {
    bg: 'bg-blush',
    border: 'border-blush',
    text: 'text-pink-700',
    label: 'Blush',
  },
  PERSONAL: {
    bg: 'bg-lavender',
    border: 'border-lavender',
    text: 'text-purple-700',
    label: 'Lavender',
  },
  ADMIN: {
    bg: 'bg-cloud',
    border: 'border-stone',
    text: 'text-slate',
    label: 'Neutral',
  },
};

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
