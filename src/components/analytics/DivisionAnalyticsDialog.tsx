import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/Dialog';
import { X, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Chart } from '../ui/Chart';

interface DivisionAnalyticsDialogProps {
  division: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DivisionStats {
  activeOpportunities: number;
  totalValue: number;
  winRate: number;
  activeChange: number;
  valueChange: number;
  winRateChange: number;
}

interface MonthlyData {
  month: string;
  value: number;
}

function formatValue(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

export function DivisionAnalyticsDialog({ division, isOpen, onClose }: DivisionAnalyticsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DivisionStats>({
    activeOpportunities: 0,
    totalValue: 0,
    winRate: 0,
    activeChange: 0,
    valueChange: 0,
    winRateChange: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchDivisionStats();
    }
  }, [isOpen, division]);

  async function fetchDivisionStats() {
    setLoading(true);
    try {
      const { data: opportunities, error } = await supabase
        .schema('business')
        .from('opportunities')
        .select('*')
        .eq('amp_division', division)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const thisMonthStart = startOfMonth(now);

      // Filter opportunities created last month (for other change calculations)
      const lastMonthOpps = opportunities.filter(opp => {
          const createdAt = new Date(opp.created_at);
          return createdAt >= lastMonthStart && createdAt < thisMonthStart;
      });

      // Active opportunities (Quote or Decision stage)
      const activeOpps = opportunities.filter(opp => 
          opp.sales_stage && (
              opp.sales_stage.toLowerCase() === 'quote' || 
              opp.sales_stage.toLowerCase() === 'decision'
          )
      );

      // Awarded opportunities
      const awardedOpps = opportunities.filter(opp => opp.status.toLowerCase() === 'awarded');
      const totalValue = awardedOpps.reduce((sum, opp) => sum + (opp.expected_value || 0), 0);

      // Win rate
      const awardedCount = awardedOpps.length;
      const lost = opportunities.filter(opp => opp.status.toLowerCase() === 'lost').length;
      const winRate = awardedCount + lost > 0 ? (awardedCount / (awardedCount + lost)) * 100 : 0;

      // Calculate changes from last month for other stats
      const lastMonthActive = lastMonthOpps.filter(opp => 
          opp.sales_stage && (
              opp.sales_stage.toLowerCase() === 'quote' || 
              opp.sales_stage.toLowerCase() === 'decision'
          )
      ).length;
      const lastMonthAwardedOpps = lastMonthOpps.filter(opp => opp.status.toLowerCase() === 'awarded');
      const lastMonthValue = lastMonthAwardedOpps.reduce((sum, opp) => sum + (opp.expected_value || 0), 0);
      const lastMonthAwardedCount = lastMonthAwardedOpps.length;
      const lastMonthLost = lastMonthOpps.filter(opp => opp.status.toLowerCase() === 'lost').length;
      const lastMonthWinRate = lastMonthAwardedCount + lastMonthLost > 0 
        ? (lastMonthAwardedCount / (lastMonthAwardedCount + lastMonthLost)) * 100 
        : 0;

      setStats({
        activeOpportunities: activeOpps.length,
        totalValue,
        winRate,
        activeChange: lastMonthActive > 0 
          ? ((activeOpps.length - lastMonthActive) / lastMonthActive) * 100 
          : activeOpps.length > 0 ? 100 : 0,
        valueChange: lastMonthValue > 0 
          ? ((totalValue - lastMonthValue) / lastMonthValue) * 100 
          : totalValue > 0 ? 100 : 0,
        winRateChange: winRate - lastMonthWinRate
      });

      // Calculate monthly chart data (based on awarded)
      const months = Array.from({ length: 12 }, (_, i) => subMonths(now, i)).reverse();
      const chartData = months.map(date => {
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        const monthOpportunities = awardedOpps.filter(opp => {
          const awardedDate = opp.awarded_date ? new Date(opp.awarded_date) : new Date(opp.created_at);
          return awardedDate >= start && awardedDate <= end;
        });
        const monthTotalValue = monthOpportunities.reduce((sum, opp) => sum + (opp.expected_value || 0), 0);
        return {
          month: format(date, 'MMM yyyy'),
          value: monthTotalValue
        };
      });
      setMonthlyData(chartData);

    } catch (error) {
      console.error('Error fetching division stats:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDivisionName(division: string): string {
    const divisionMap: { [key: string]: string } = {
      'north_alabama': 'North Alabama Division',
      'tennessee': 'Tennessee Division',
      'georgia': 'Georgia Division',
      'international': 'International Division'
    };
    return divisionMap[division] || division;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogOverlay className="fixed inset-0 bg-black opacity-30" />
      <DialogContent className="fixed inset-0 z-10 overflow-y-auto flex items-center justify-center min-h-screen">
        <div className="relative bg-white dark:bg-dark-150 rounded-lg max-w-4xl w-full mx-auto p-6 shadow-xl">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <DialogTitle className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {formatDivisionName(division)} Analytics
          </DialogTitle>

          {loading ? (
            <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Active Opportunities</h3>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.activeOpportunities}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.activeChange > 0 ? '+' : ''}{stats.activeChange.toFixed(1)}% from last month
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Total Value</h3>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {formatValue(stats.totalValue)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.valueChange > 0 ? '+' : ''}{stats.valueChange.toFixed(1)}% from last month
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-dark-100 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Win Rate</h3>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.winRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.winRateChange > 0 ? '+' : ''}{stats.winRateChange.toFixed(1)}% from last month
                  </p>
                </div>
              </div>

              {/* Monthly Chart */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Monthly Awarded Opportunity Values
                </h3>
                {monthlyData.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No awarded opportunities found
                  </div>
                ) : (
                  <Chart 
                    data={monthlyData} 
                    fontColor="var(--foreground)"
                    barColor="#f26722"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 