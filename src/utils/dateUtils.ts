/**
 * Date utility functions for the application
 */

import { format, differenceInDays, differenceInMonths, parseISO, isValid } from 'date-fns';

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) {
      return 'Invalid date';
    }
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Calculate the time elapsed as a percentage between start and end dates
 */
export function getTimeElapsedPercentage(startDate: string, endDate: string): number {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    const now = new Date();
    
    if (!isValid(start) || !isValid(end)) {
      return 0;
    }
    
    const totalDuration = differenceInDays(end, start);
    const elapsedDuration = differenceInDays(now, start);
    
    if (totalDuration <= 0) {
      return 100;
    }
    
    // If the end date is in the past, return 100%
    if (now > end) {
      return 100;
    }
    
    // If the start date is in the future, return 0%
    if (now < start) {
      return 0;
    }
    
    return Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
  } catch (error) {
    console.error('Error calculating time elapsed percentage:', error);
    return 0;
  }
}

/**
 * Calculate days remaining until the end date
 */
export function getDaysRemaining(endDate: string): number {
  try {
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    const now = new Date();
    
    if (!isValid(end)) {
      return 0;
    }
    
    // If the end date is in the past, return 0
    if (now > end) {
      return 0;
    }
    
    return differenceInDays(end, now);
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return 0;
  }
}

/**
 * Calculate months between two dates
 */
export function getMonthsBetween(startDate: string, endDate: string): number {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    if (!isValid(start) || !isValid(end)) {
      return 0;
    }
    
    return differenceInMonths(end, start);
  } catch (error) {
    console.error('Error calculating months between dates:', error);
    return 0;
  }
}

/**
 * Helper function to determine if a string represents a valid date
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString) return false;
  
  try {
    const date = parseISO(dateString);
    return isValid(date);
  } catch (error) {
    return false;
  }
}

/**
 * Determines if a date is in the past
 * @param dateString ISO date string
 * @returns True if the date is in the past, false otherwise
 */
export function isDatePast(dateString: string): boolean {
  return new Date(dateString) < new Date();
} 