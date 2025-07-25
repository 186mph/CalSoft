import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui";
import { Plus, TrendingUp, Users, DollarSign, Calendar, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { Opportunity } from "../../lib/types/index";
import { Dialog } from "@headlessui/react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Chart } from "../../components/ui/Chart";
import { fetchOpportunitiesWithCustomers } from "../../lib/crossSchemaQueries";
import { RevenueForecastChart } from "../../components/forecast/RevenueForecastChart";
import { calculateRevenueForecast, applyWinProbability, ForecastData, OpportunityData } from "../../lib/forecasting";

interface OpportunityWithCustomer extends Omit<Opportunity, 'status'> {
  status: string; // Use string type to handle any status value from the database
  customers?: {
    company_name?: string | null;
    name: string;
  };
}

interface MonthlyData {
  month: string;
  value: number;
}

interface Stats {
  activeOpportunities: number;
  totalValue: number;
  newLeads: number;
  winRate: number;
  activeChange: number;
  valueChange: number;
  leadsChange: number;
  winRateChange: number;
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

export default function SalesDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<OpportunityWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActiveOpportunities, setShowActiveOpportunities] = useState(false);
  const [showValueChart, setShowValueChart] = useState(false);
  const [showForecastChart, setShowForecastChart] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [stats, setStats] = useState<Stats>({
    activeOpportunities: 0,
    totalValue: 0,
    newLeads: 0,
    winRate: 0,
    activeChange: 0,
    valueChange: 0,
    leadsChange: 0,
    winRateChange: 0,
  });

  useEffect(() => {
    if (user) {
      fetchSalesData();
    }
  }, [user]);

  useEffect(() => {
    if (opportunities.length > 0) {
      calculateMonthlyData();
      calculateForecastData();
    }
  }, [opportunities]);

  function calculateMonthlyData() {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => subMonths(now, i)).reverse();
    
    const data = months.map(date => {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const monthOpportunities = opportunities.filter(opp => {
        const oppDate = new Date(opp.created_at);
        return oppDate >= start && oppDate <= end && opp.status.toLowerCase() === 'awarded';
      });

      const totalValue = monthOpportunities.reduce((sum, opp) => 
        sum + (opp.expected_value || 0), 0
      );

      return {
        month: format(date, 'MMM yyyy'),
        value: totalValue // Pass the raw value to the chart
      };
    });

    setMonthlyData(data);
  }

  async function fetchSalesData() {
    setLoading(true);
    try {
      console.log('Fetching opportunities data with explicit schema references');
      const { data: opportunities, error: opportunitiesError } = await supabase
        .schema('business')
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (opportunitiesError) {
        console.error('Error fetching opportunities:', opportunitiesError);
        throw opportunitiesError;
      }

      // Fetch customer data separately for each opportunity
      const opportunitiesWithCustomers = await Promise.all(
        (opportunities || []).map(async (opportunity) => {
          if (!opportunity.customer_id) {
            return { ...opportunity, customers: null };
          }

          const { data: customerData, error: customerError } = await supabase
            .schema('common')
            .from('customers')
            .select('id, name, company_name')
            .eq('id', opportunity.customer_id)
            .single();

          if (customerError) {
            console.warn(`Error fetching customer for opportunity ${opportunity.id}:`, customerError);
            return { ...opportunity, customers: null };
          }

          return { ...opportunity, customers: customerData };
        })
      );

      setOpportunities(opportunitiesWithCustomers);
      calculateStats(opportunitiesWithCustomers);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  // Helper function to calculate stats
  function calculateStats(opportunities) {
    // Calculate stats
    const now = new Date();
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const thisMonthStart = startOfMonth(now);

    // Active opportunities (not lost or awarded)
    const activeOpps = opportunities.filter(opp => 
      !['lost', 'awarded'].includes(opp.status.toLowerCase())
    );

    // Total value of AWARDED opportunities
    const awardedOpps = opportunities.filter(opp => 
      opp.status.toLowerCase() === 'awarded'
    );
    const totalValue = awardedOpps.reduce((sum, opp) => 
      sum + (opp.expected_value || 0), 0
    );

    // New leads this month
    const newLeads = opportunities.filter(opp => 
      new Date(opp.created_at) >= thisMonthStart
    ).length;

    // Win rate (awarded / (awarded + lost))
    const awardedCount = awardedOpps.length;
    const lost = opportunities.filter(opp => 
      opp.status.toLowerCase() === 'lost'
    ).length;
    const winRate = awardedCount + lost > 0 ? (awardedCount / (awardedCount + lost)) * 100 : 0;

    // Calculate changes from last month
    const lastMonthOpps = opportunities.filter(opp => {
        const createdAt = new Date(opp.created_at);
        return createdAt >= lastMonthStart && createdAt < thisMonthStart;
    });

    const lastMonthActive = lastMonthOpps.filter(opp => 
      !['lost', 'awarded'].includes(opp.status.toLowerCase())
    ).length;

    // Last month's AWARDED value
    const lastMonthAwardedOpps = lastMonthOpps.filter(opp => 
      opp.status.toLowerCase() === 'awarded'
    );
    const lastMonthValue = lastMonthAwardedOpps.reduce((sum, opp) => 
      sum + (opp.expected_value || 0), 0
    );

    const lastMonthLeads = lastMonthOpps.filter(opp => 
      new Date(opp.created_at) >= lastMonthStart
    ).length;

    const lastMonthAwardedCount = lastMonthAwardedOpps.length;
    const lastMonthLost = lastMonthOpps.filter(opp => 
      opp.status.toLowerCase() === 'lost'
    ).length;
    const lastMonthWinRate = lastMonthAwardedCount + lastMonthLost > 0 
      ? (lastMonthAwardedCount / (lastMonthAwardedCount + lastMonthLost)) * 100 
      : 0;

    setStats({
      activeOpportunities: activeOpps.length,
      totalValue, // Use the awarded total value
      newLeads,
      winRate,
      activeChange: lastMonthActive > 0 
        ? ((activeOpps.length - lastMonthActive) / lastMonthActive) * 100 
        : activeOpps.length > 0 ? 100 : 0, // Handle division by zero or 0 to X change
      valueChange: lastMonthValue > 0 
        ? ((totalValue - lastMonthValue) / lastMonthValue) * 100 
        : totalValue > 0 ? 100 : 0, // Use awarded values for change calculation
      leadsChange: lastMonthLeads > 0 
        ? ((newLeads - lastMonthLeads) / lastMonthLeads) * 100 
        : newLeads > 0 ? 100 : 0,
      winRateChange: winRate - lastMonthWinRate // Direct difference in percentage points
    });
  }

  // Add new function for forecast calculation
  function calculateForecastData() {
    // Convert opportunities to the format expected by the forecasting service
    const opportunityData: OpportunityData[] = opportunities.map(opp => ({
      created_at: opp.created_at,
      expected_value: opp.expected_value || 0,
      status: opp.status
    }));

    // Apply win probability adjustments to open opportunities
    const adjustedOpportunities = applyWinProbability(opportunityData);
    
    // Calculate forecast data
    const forecast = calculateRevenueForecast(adjustedOpportunities, 12, 6);
    setForecastData(forecast);
  }

  const activeOpportunities = opportunities.filter(opp => 
    !['lost', 'awarded'].includes(opp.status.toLowerCase())
  );

  return (
    <main className="flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Sales Portal</h1>
        <p className="mt-2 text-gray-600 dark:text-dark-400">Welcome to your sales management portal</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card 
          className="border border-gray-200 dark:border-dark-200 dark:bg-dark-150 cursor-pointer hover:border-accent-color dark:hover:border-amp-orange-600 transition-colors"
          onClick={() => setShowActiveOpportunities(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-emerald-50 dark:bg-emerald-900/50">
                <TrendingUp className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base font-medium text-gray-900 dark:text-dark-900">Active Opportunities</CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-dark-400">Current pipeline</CardDescription>
              </div>
            </div>
            <Badge className="!bg-accent-color !text-white px-2.5 py-1 text-xs font-medium">Sales</Badge>
          </CardHeader>
          <CardContent className="px-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-dark-900">
              {loading ? '...' : stats.activeOpportunities}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400 mt-1">
              {stats.activeChange > 0 ? '+' : ''}{stats.activeChange.toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border border-gray-200 dark:border-dark-200 dark:bg-dark-150 cursor-pointer hover:border-accent-color dark:hover:border-amp-orange-600 transition-colors"
          onClick={() => setShowValueChart(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-blue-50 dark:bg-blue-900/50">
                <DollarSign className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base font-medium text-gray-900 dark:text-dark-900">Total Value</CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-dark-400">Total awarded value</CardDescription>
              </div>
            </div>
            <Badge className="!bg-accent-color !text-white px-2.5 py-1 text-xs font-medium">Sales</Badge>
          </CardHeader>
          <CardContent className="px-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-dark-900">
              {loading ? '...' : formatValue(stats.totalValue)}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400 mt-1">
              {stats.valueChange > 0 ? '+' : ''}{stats.valueChange.toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border border-gray-200 dark:border-dark-200 dark:bg-dark-150 cursor-pointer hover:border-accent-color dark:hover:border-amp-orange-600 transition-colors"
          onClick={() => navigate('/sales-dashboard/opportunities')}
        >
          <CardHeader className="flex flex-row items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-purple-50 dark:bg-purple-900/50">
                <Users className="h-5 w-5 text-purple-500 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-base font-medium text-gray-900 dark:text-dark-900">New Leads</CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-dark-400">This month</CardDescription>
              </div>
            </div>
            <Badge className="!bg-accent-color !text-white px-2.5 py-1 text-xs font-medium">Sales</Badge>
          </CardHeader>
          <CardContent className="px-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-dark-900">
              {loading ? '...' : stats.newLeads}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400 mt-1">
              {stats.leadsChange > 0 ? '+' : ''}{stats.leadsChange.toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border border-gray-200 dark:border-dark-200 dark:bg-dark-150 cursor-pointer hover:border-accent-color dark:hover:border-amp-orange-600 transition-colors"
          onClick={() => navigate('/sales-dashboard/opportunities')}
        >
          <CardHeader className="flex flex-row items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-accent-color/10 dark:bg-orange-900/50">
                <Calendar className="h-5 w-5 text-accent-color dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-base font-medium text-gray-900 dark:text-dark-900">Win Rate</CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-dark-400">Last 30 days</CardDescription>
              </div>
            </div>
            <Badge className="!bg-accent-color !text-white px-2.5 py-1 text-xs font-medium">Sales</Badge>
          </CardHeader>
          <CardContent className="px-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-dark-900">
              {loading ? '...' : `${stats.winRate.toFixed(1)}%`}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400 mt-1">
              {stats.winRateChange > 0 ? '+' : ''}{stats.winRateChange.toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        {/* New card for revenue forecast */}
        <Card 
          className="border border-gray-200 dark:border-dark-200 dark:bg-dark-150 cursor-pointer hover:border-accent-color dark:hover:border-amp-orange-600 transition-colors"
          onClick={() => setShowForecastChart(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-900/50">
                <TrendingUp className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-base font-medium text-gray-900 dark:text-dark-900">Revenue Forecast</CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-dark-400">Next 6 months</CardDescription>
              </div>
            </div>
            <Badge className="!bg-accent-color !text-white px-2.5 py-1 text-xs font-medium">Forecast</Badge>
          </CardHeader>
          <CardContent className="px-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-dark-900">
              {loading ? '...' : forecastData.length > 0 
                ? formatValue(forecastData[forecastData.length - 1].forecast || 0) 
                : '$0'}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400 mt-1">
              Projected 6-month revenue
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Opportunities Dialog */}
      <Dialog
        open={showActiveOpportunities}
        onClose={() => setShowActiveOpportunities(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-dark-150 rounded-lg max-w-4xl w-full mx-auto p-6 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                onClick={() => setShowActiveOpportunities(false)}
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>

            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Active Opportunities
            </Dialog.Title>

            <div className="mt-4">
              {loading ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading...</div>
              ) : activeOpportunities.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No active opportunities found
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-accent-color dark:hover:border-accent-color cursor-pointer transition-colors bg-white dark:bg-dark-150"
                      onClick={() => {
                        setShowActiveOpportunities(false);
                        navigate(`/sales-dashboard/opportunities/${opp.id}`);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-medium text-gray-900 dark:text-white">
                            {opp.title || 'Untitled Opportunity'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {opp.customers?.company_name || 'No company'}
                          </p>
                        </div>
                        <Badge className="!bg-accent-color !text-white">
                          ${((opp.expected_value || 0) / 1000).toFixed(1)}k
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Created {format(new Date(opp.created_at), 'MMM d, yyyy')}</span>
                        <span>•</span>
                        <span className="capitalize">{opp.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2"
                onClick={() => setShowActiveOpportunities(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Value Chart Dialog */}
      <Dialog
        open={showValueChart}
        onClose={() => setShowValueChart(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-dark-150 rounded-lg max-w-4xl w-full mx-auto p-6 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                onClick={() => setShowValueChart(false)}
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>

            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Monthly Awarded Opportunity Values
            </Dialog.Title>

            <div className="mt-4">
              {loading ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading...</div>
              ) : monthlyData.length === 0 ? (
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

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2"
                onClick={() => setShowValueChart(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Revenue Forecast Dialog */}
      <Dialog
        open={showForecastChart}
        onClose={() => setShowForecastChart(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-dark-150 rounded-lg max-w-4xl w-full mx-auto p-6 shadow-xl">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                onClick={() => setShowForecastChart(false)}
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>

            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Revenue Forecast (6-Month Projection)
            </Dialog.Title>

            <div className="mt-4">
              {loading ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading...</div>
              ) : forecastData.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No opportunity data available for forecasting
                </div>
              ) : (
                <div>
                  <RevenueForecastChart 
                    data={forecastData} 
                    fontColor="var(--foreground)"
                    actualColor="#4f46e5"
                    forecastColor="#f26722"
                  />
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    <p>This forecast is based on historical opportunity data and current pipeline status.</p>
                    <p>The solid area represents actual revenue, while the dashed line shows projected revenue.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-dark-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2"
                onClick={() => setShowForecastChart(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
          <Card 
            className="border border-gray-200 dark:border-dark-200 dark:bg-dark-150 cursor-pointer hover:border-accent-color dark:hover:border-amp-orange-600 transition-colors" 
            onClick={() => navigate('/sales-dashboard/opportunities')}
          >
            <CardHeader className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-emerald-50 dark:bg-emerald-900/50">
                  <TrendingUp className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium text-gray-900 dark:text-dark-900">View Opportunities</CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-dark-400">Manage your sales pipeline</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="border border-gray-200 dark:border-dark-200 dark:bg-dark-150 cursor-pointer hover:border-accent-color dark:hover:border-amp-orange-600 transition-colors" 
            onClick={() => navigate('/sales-dashboard/customers')}
          >
            <CardHeader className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-blue-50 dark:bg-blue-900/50">
                  <Users className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium text-gray-900 dark:text-dark-900">Manage Customers</CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-dark-400">View and edit customer data</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="border border-gray-200 dark:border-dark-200 dark:bg-dark-150 cursor-pointer hover:border-accent-color dark:hover:border-amp-orange-600 transition-colors" 
            onClick={() => navigate('/sales-dashboard/contacts')}
          >
            <CardHeader className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-900/50">
                  <Users className="h-5 w-5 text-rose-500 dark:text-rose-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium text-gray-900 dark:text-dark-900">Manage Contacts</CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-dark-400">View and edit contact information</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </main>
  );
} 