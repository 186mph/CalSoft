import { supabase } from '@/lib/supabase';
import { 
  AssetTestingHistory, 
  TestingHistoryStats, 
  AddTestRecordData, 
  AssetWithTestingHistory,
  TestMeasurements 
} from '@/types/assetTesting';
import { format, subYears, differenceInDays } from 'date-fns';

export class AssetTestingService {
  /**
   * Get testing history for a specific asset
   */
  static async getAssetTestingHistory(
    assetId: string, 
    schema: 'neta_ops' | 'lab_ops' = 'lab_ops'
  ): Promise<AssetTestingHistory[]> {
    try {
      const { data, error } = await supabase
        .schema(schema)
        .from('asset_testing_history')
        .select(`
          *,
          test_performed_by_user:test_performed_by(email),
          created_by_user:created_by(email)
        `)
        .eq('asset_id', assetId)
        .order('test_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching asset testing history:', error);
      throw error;
    }
  }

  /**
   * Add a new test record for an asset
   */
  static async addTestRecord(
    testData: AddTestRecordData, 
    schema: 'neta_ops' | 'lab_ops' = 'lab_ops'
  ): Promise<AssetTestingHistory> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const record = {
        ...testData,
        created_by: user.user.id,
        test_performed_by: user.user.id
      };

      const { data, error } = await supabase
        .schema(schema)
        .from('asset_testing_history')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding test record:', error);
      throw error;
    }
  }

  /**
   * Update an existing test record
   */
  static async updateTestRecord(
    id: string,
    updates: Partial<AddTestRecordData>,
    schema: 'neta_ops' | 'lab_ops' = 'lab_ops'
  ): Promise<AssetTestingHistory> {
    try {
      const { data, error } = await supabase
        .schema(schema)
        .from('asset_testing_history')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating test record:', error);
      throw error;
    }
  }

  /**
   * Delete a test record
   */
  static async deleteTestRecord(
    id: string, 
    schema: 'neta_ops' | 'lab_ops' = 'lab_ops'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .schema(schema)
        .from('asset_testing_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting test record:', error);
      throw error;
    }
  }

  /**
   * Calculate testing statistics for an asset
   */
  static calculateTestingStats(history: AssetTestingHistory[]): TestingHistoryStats {
    if (!history || history.length === 0) {
      return {
        total_tests: 0,
        pass_rate: 0,
        average_condition_rating: 0,
        latest_test_date: '',
        degradation_trend: 'unknown',
        tests_per_year: 0
      };
    }

    // Sort by test date (most recent first)
    const sortedHistory = [...history].sort((a, b) => 
      new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
    );

    const total_tests = history.length;
    const passed_tests = history.filter(test => test.pass_fail_status === 'PASS').length;
    const pass_rate = total_tests > 0 ? (passed_tests / total_tests) * 100 : 0;

    // Calculate average condition rating
    const ratingsWithValues = history.filter(test => test.condition_rating !== null);
    const average_condition_rating = ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((sum, test) => sum + (test.condition_rating || 0), 0) / ratingsWithValues.length
      : 0;

    const latest_test_date = sortedHistory[0]?.test_date || '';

    // Calculate degradation trend
    const degradation_trend = this.calculateDegradationTrend(sortedHistory);

    // Calculate tests per year
    const firstTestDate = new Date(sortedHistory[sortedHistory.length - 1]?.test_date || new Date());
    const lastTestDate = new Date(sortedHistory[0]?.test_date || new Date());
    const daysDifference = differenceInDays(lastTestDate, firstTestDate);
    const yearsDifference = daysDifference / 365.25;
    const tests_per_year = yearsDifference > 0 ? total_tests / yearsDifference : total_tests;

    return {
      total_tests,
      pass_rate,
      average_condition_rating,
      latest_test_date,
      degradation_trend,
      tests_per_year
    };
  }

  /**
   * Calculate degradation trend based on condition ratings over time
   */
  private static calculateDegradationTrend(
    sortedHistory: AssetTestingHistory[]
  ): 'improving' | 'stable' | 'declining' | 'unknown' {
    const ratingsWithDates = sortedHistory
      .filter(test => test.condition_rating !== null)
      .map(test => ({
        rating: test.condition_rating!,
        date: new Date(test.test_date)
      }))
      .reverse(); // Oldest first for trend calculation

    if (ratingsWithDates.length < 2) return 'unknown';

    // Simple trend calculation using first and last ratings
    const firstRating = ratingsWithDates[0].rating;
    const lastRating = ratingsWithDates[ratingsWithDates.length - 1].rating;
    const difference = lastRating - firstRating;

    // For more sophisticated trend analysis, you could use linear regression
    // For now, using simple comparison with threshold
    if (difference > 0.5) return 'improving';
    if (difference < -0.5) return 'declining';
    return 'stable';
  }

  /**
   * Get assets with their testing history for a job
   */
  static async getAssetsWithTestingHistory(
    jobId: string,
    schema: 'neta_ops' | 'lab_ops' = 'lab_ops'
  ): Promise<AssetWithTestingHistory[]> {
    try {
      // First get assets for the job
      const assetTable = schema === 'lab_ops' ? 'lab_assets' : 'assets';
      const { data: assets, error: assetsError } = await supabase
        .schema(schema)
        .from(assetTable)
        .select('*')
        .eq('job_id', jobId);

      if (assetsError) throw assetsError;

      // Then get testing history for each asset
      const assetsWithHistory = await Promise.all(
        (assets || []).map(async (asset) => {
          const history = await this.getAssetTestingHistory(asset.id, schema);
          const stats = this.calculateTestingStats(history);
          const latest_test = history[0] || undefined;

          return {
            ...asset,
            testing_history: history,
            testing_stats: stats,
            latest_test,
            latest_condition_rating: latest_test?.condition_rating || undefined,
            latest_pass_fail: latest_test?.pass_fail_status || undefined
          } as AssetWithTestingHistory;
        })
      );

      return assetsWithHistory;
    } catch (error) {
      console.error('Error fetching assets with testing history:', error);
      throw error;
    }
  }

  /**
   * Get testing history summary for multiple assets
   */
  static async getTestingHistorySummary(
    assetIds: string[],
    schema: 'neta_ops' | 'lab_ops' = 'lab_ops'
  ): Promise<Record<string, TestingHistoryStats>> {
    try {
      const summary: Record<string, TestingHistoryStats> = {};

      await Promise.all(
        assetIds.map(async (assetId) => {
          const history = await this.getAssetTestingHistory(assetId, schema);
          summary[assetId] = this.calculateTestingStats(history);
        })
      );

      return summary;
    } catch (error) {
      console.error('Error fetching testing history summary:', error);
      throw error;
    }
  }

  /**
   * Search test records by criteria
   */
  static async searchTestRecords(
    criteria: {
      assetIds?: string[];
      testType?: string;
      passFailStatus?: 'PASS' | 'FAIL' | 'CONDITIONAL';
      dateFrom?: string;
      dateTo?: string;
      conditionRatingMin?: number;
      conditionRatingMax?: number;
    },
    schema: 'neta_ops' | 'lab_ops' = 'lab_ops'
  ): Promise<AssetTestingHistory[]> {
    try {
      let query = supabase
        .schema(schema)
        .from('asset_testing_history')
        .select('*')
        .order('test_date', { ascending: false });

      if (criteria.assetIds && criteria.assetIds.length > 0) {
        query = query.in('asset_id', criteria.assetIds);
      }

      if (criteria.testType) {
        query = query.eq('test_type', criteria.testType);
      }

      if (criteria.passFailStatus) {
        query = query.eq('pass_fail_status', criteria.passFailStatus);
      }

      if (criteria.dateFrom) {
        query = query.gte('test_date', criteria.dateFrom);
      }

      if (criteria.dateTo) {
        query = query.lte('test_date', criteria.dateTo);
      }

      if (criteria.conditionRatingMin !== undefined) {
        query = query.gte('condition_rating', criteria.conditionRatingMin);
      }

      if (criteria.conditionRatingMax !== undefined) {
        query = query.lte('condition_rating', criteria.conditionRatingMax);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching test records:', error);
      throw error;
    }
  }
} 