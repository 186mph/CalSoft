import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface OpportunityData {
  created_at: string;
  expected_value: number;
  status: string;
}

export interface ForecastData {
  month: string;
  actual?: number;
  forecast?: number;
}

// Define an internal type that includes the date property for sorting
interface InternalForecastData extends ForecastData {
  date: Date;
}

/**
 * Calculate revenue forecast based on historical opportunity data
 * Uses a simple linear regression model to predict future revenue
 * 
 * @param opportunities - Array of opportunity data with created_at, expected_value, and status
 * @param historyMonths - Number of months of historical data to use
 * @param forecastMonths - Number of months to forecast into the future
 * @returns Array of ForecastData with actual and forecast values
 */
export function calculateRevenueForecast(
  opportunities: OpportunityData[],
  historyMonths: number = 12,
  forecastMonths: number = 6
): ForecastData[] {
  const now = new Date();
  
  // Generate historical data
  const historicalMonths = Array.from(
    { length: historyMonths },
    (_, i) => subMonths(now, historyMonths - i - 1)
  );
  
  // Calculate actual revenue for historical months
  const actualData: InternalForecastData[] = historicalMonths.map(date => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    const monthOpportunities = opportunities.filter(opp => {
      const oppDate = new Date(opp.created_at);
      return oppDate >= start && oppDate <= end && opp.status.toLowerCase() === 'awarded';
    });

    const value = monthOpportunities.reduce(
      (sum, opp) => sum + (opp.expected_value || 0),
      0
    );

    return {
      month: format(date, 'MMM yyyy'),
      actual: value,
      date // Keep date for sorting
    };
  });
  
  // Calculate forecast using simple linear regression
  const xValues = actualData.map((_, i) => i);
  const yValues = actualData.map(d => d.actual || 0);
  
  // Calculate slope and y-intercept for the line of best fit
  const n = xValues.length;
  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate forecast data
  const futureMonths = Array.from(
    { length: forecastMonths },
    (_, i) => addMonths(now, i + 1)
  );
  
  const forecastData: InternalForecastData[] = futureMonths.map((date, i) => {
    const forecastValue = intercept + slope * (historyMonths + i);
    // Ensure forecast value is not negative
    const forecast = Math.max(0, forecastValue);
    
    return {
      month: format(date, 'MMM yyyy'),
      forecast,
      date // Keep date for sorting
    };
  });
  
  // Combine actual and forecast data
  const combinedData: InternalForecastData[] = [
    ...actualData,
    ...forecastData
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Remove the date property used for sorting
  return combinedData.map(({ month, actual, forecast }) => ({ 
    month, 
    actual, 
    forecast 
  }));
}

/**
 * Apply win probability adjustments to opportunity values for more accurate forecasting
 * 
 * @param opportunities - Array of opportunity data
 * @param probabilityMap - Map of status to probability (e.g. { 'proposal': 0.5, 'negotiation': 0.8 })
 * @returns Array of adjusted opportunity data
 */
export function applyWinProbability(
  opportunities: OpportunityData[],
  probabilityMap: Record<string, number> = {
    'lead': 0.1,
    'prospect': 0.2,
    'qualified': 0.3,
    'proposal': 0.5,
    'negotiation': 0.7,
    'awarded': 1.0,
    'lost': 0
  }
): OpportunityData[] {
  return opportunities.map(opp => {
    const status = opp.status.toLowerCase();
    const probability = probabilityMap[status] || 0;
    
    return {
      ...opp,
      expected_value: opp.expected_value * probability
    };
  });
} 