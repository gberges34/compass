import { format } from 'date-fns';

export function calculateTimeOfDay(time: Date): string {
  const hour = time.getHours();

  if (hour >= 5 && hour < 8) return 'EARLY_MORNING';
  if (hour >= 8 && hour < 11) return 'MORNING';
  if (hour >= 11 && hour < 14) return 'MIDDAY';
  if (hour >= 14 && hour < 17) return 'AFTERNOON';
  if (hour >= 17 && hour < 20) return 'EVENING';
  return 'NIGHT';
}

export function getDayOfWeek(date: Date): string {
  return format(date, 'EEEE'); // Monday, Tuesday, etc.
}
