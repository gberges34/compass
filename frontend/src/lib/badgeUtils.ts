import type { BadgeVariant } from '../components/Badge';

/**
 * Maps task priority to Badge variant
 */
export const getPriorityBadgeVariant = (priority: string): BadgeVariant => {
  switch (priority) {
    case 'MUST':
      return 'danger';
    case 'SHOULD':
      return 'warn';
    case 'COULD':
      return 'sun';
    case 'MAYBE':
      return 'neutral';
    default:
      return 'neutral';
  }
};

/**
 * Maps energy level to Badge variant
 */
export const getEnergyBadgeVariant = (energy: string): BadgeVariant => {
  switch (energy) {
    case 'HIGH':
      return 'mint';
    case 'MEDIUM':
      return 'sun';
    case 'LOW':
      return 'blush';
    default:
      return 'neutral';
  }
};
