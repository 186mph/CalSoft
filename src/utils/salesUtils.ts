/**
 * Utility functions for sales calculations and formatting
 */

/**
 * Calculates the progress percentage towards a goal
 * @param currentValue Current achieved value
 * @param targetValue Target goal value
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(currentValue: number, targetValue: number): number {
  if (targetValue === 0) return 0;
  
  const progress = (currentValue / targetValue) * 100;
  return Math.min(Math.round(progress), 100); // Cap at 100%
}

/**
 * Formats a number as currency
 * @param value Number to format
 * @param currency Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Calculates the percentage change between two values
 * @param currentValue Current value
 * @param previousValue Previous value
 * @returns Percentage change with + or - sign
 */
export function calculatePercentageChange(currentValue: number, previousValue: number): string {
  if (previousValue === 0) return '+∞%';
  
  const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Determines the status of a goal based on progress and time elapsed
 * @param progress Progress percentage (0-100)
 * @param timeElapsed Time elapsed percentage (0-100)
 * @returns Status: 'on-track', 'at-risk', or 'behind'
 */
export function determineGoalStatus(progress: number, timeElapsed: number): 'on-track' | 'at-risk' | 'behind' {
  // If progress is ahead of time elapsed, the goal is on track
  if (progress >= timeElapsed) return 'on-track';
  
  // If progress is within 15% of time elapsed, the goal is at risk
  if (progress >= timeElapsed - 15) return 'at-risk';
  
  // Otherwise, the goal is behind
  return 'behind';
}

/**
 * Projects the final value based on current progress and time elapsed
 * @param currentValue Current achieved value
 * @param timeElapsedPercentage Percentage of time elapsed (0-100)
 * @returns Projected final value
 */
export function projectFinalValue(currentValue: number, timeElapsedPercentage: number): number {
  if (timeElapsedPercentage === 0) return 0;
  
  const projectedValue = (currentValue / timeElapsedPercentage) * 100;
  return Math.round(projectedValue);
} 