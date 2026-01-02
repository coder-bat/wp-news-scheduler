/**
 * Scheduling utilities
 * Lateness guard and slot determination
 */

import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';

export type Slot = 'morning' | 'afternoon' | 'evening';

export interface ScheduleConfig {
  timezone: string;
  slots: {
    morning: string;   // "09:00"
    afternoon: string; // "13:00"
    evening: string;   // "18:00"
  };
  latenessThresholdMinutes: number;
}

/**
 * Determine which slot we're running for based on current time
 */
export function determineSlot(config: ScheduleConfig): Slot | null {
  const now = new Date();
  const zonedNow = utcToZonedTime(now, config.timezone);
  const currentTime = formatInTimeZone(zonedNow, config.timezone, 'HH:mm');
  const currentMinutes = timeToMinutes(currentTime);

  // Check each slot
  for (const [slot, scheduledTime] of Object.entries(config.slots) as [Slot, string][]) {
    const scheduledMinutes = timeToMinutes(scheduledTime);
    const diff = currentMinutes - scheduledMinutes;

    // Within lateness window
    if (diff >= 0 && diff <= config.latenessThresholdMinutes) {
      return slot;
    }
  }

  return null;
}

/**
 * Check if current run is within acceptable lateness
 */
export function isWithinLatenessWindow(
  scheduledTime: string,
  config: ScheduleConfig
): boolean {
  const now = new Date();
  const zonedNow = utcToZonedTime(now, config.timezone);
  const currentTime = formatInTimeZone(zonedNow, config.timezone, 'HH:mm');

  const scheduledMinutes = timeToMinutes(scheduledTime);
  const currentMinutes = timeToMinutes(currentTime);
  const diff = currentMinutes - scheduledMinutes;

  return diff >= 0 && diff <= config.latenessThresholdMinutes;
}

/**
 * Convert HH:mm to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get human-readable slot name
 */
export function getSlotDisplayName(slot: Slot): string {
  const names: Record<Slot, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
  };
  return names[slot];
}

/**
 * Get current date string for logging
 */
export function getCurrentDateString(timezone: string): string {
  const now = new Date();
  return formatInTimeZone(now, timezone, 'yyyy-MM-dd HH:mm:ss zzz');
}
