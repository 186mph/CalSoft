import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingBag, 
  BarChart as BarChartIcon, 
  TrendingUp, 
  Calendar, 
  Filter,
  Clock,
  CheckCircle,
  ChevronRight,
  FileText
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import Card from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';

// Normalize historical calibration job numbers to 1YYXXX (strip any stray zeros in the middle)
const formatLabJobNumber = (n?: string): string => {
  if (!n) return '';
  const digits = String(n).replace(/[^0-9]/g, '');
  
  // Handle the specific pattern 1YY0XXX -> 1YYXXX (7 digits with extra zero)
  if (/^1\d{2}0\d{3}$/.test(digits)) {
    const prefix = digits.slice(0, 3);
    const seq = digits.slice(-3);
    return `${prefix}${seq}`;
  }
  
  // Handle 6-digit numbers that are already correct (1YYXXX)
  if (/^1\d{2}\d{3}$/.test(digits)) {
    return digits; // Return as-is, no formatting needed
  }
  
  // Handle other patterns that start with 1YY (fallback)
  if (/^1\d{2}\d{3,}$/.test(digits)) {
    const prefix = digits.slice(0, 3);
    const seq = digits.slice(-3).padStart(3, '0');
    return `${prefix}${seq}`;
  }
  
  return n;
};

interface ArmadilloDashboardProps {
  division: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  division?: string;
  job_number?: string;
  due_date?: string;
  customers: {
    company_name?: string | null;
    name: string;
  };
}

export const ArmadilloDashboard: React.FC<ArmadilloDashboardProps> = ({ division }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Metrics state
  const [glovesSold, setGlovesSold] = useState(0);
  const [glovesAvailable, setGlovesAvailable] = useState(0);
  const [quarterlyOrders, setQuarterlyOrders] = useState<any[]>([]);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [quarterlyData, setQuarterlyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [gloveTypes, setGloveTypes] = useState<any[]>([]);
  const [selectedGloveType, setSelectedGloveType] = useState<string>("all");
  
  // Job metrics state
  const [activeJobs, setActiveJobs] = useState(0);
  const [upcomingJobs, setUpcomingJobs] = useState(0);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);

  // Sample data for quarterly sales
  const sampleQuarterlyData = [
    { quarter: 'Q1', orders: 1245, revenue: 124500 },
    { quarter: 'Q2', orders: 1687, revenue: 168700 },
    { quarter: 'Q3', orders: 1432, revenue: 143200 },
    { quarter: 'Q4', orders: 1890, revenue: 189000 }
  ];

  // Sample data for monthly trends
  const sampleMonthlyData = [
    { name: 'Jan', sold: 385, available: 750 },
    { name: 'Feb', sold: 420, available: 650 },
    { name: 'Mar', sold: 440, available: 600 },
    { name: 'Apr', sold: 500, available: 800 },
    { name: 'May', sold: 550, available: 750 },
    { name: 'Jun', sold: 600, available: 700 },
    { name: 'Jul', sold: 550, available: 650 },
    { name: 'Aug', sold: 580, available: 600 },
    { name: 'Sep', sold: 620, available: 750 },
    { name: 'Oct', sold: 650, available: 700 },
    { name: 'Nov', sold: 670, available: 650 },
    { name: 'Dec', sold: 700, available: 600 }
  ];

  // Sample data for glove voltage classes
  const sampleGloveTypes = [
    { name: 'Class 00', available: 210, sold: 450 },
    { name: 'Class 0', available: 180, sold: 520 },
    { name: 'Class 1', available: 150, sold: 480 },
    { name: 'Class 2', available: 120, sold: 430 },
    { name: 'Class 3', available: 112, sold: 400 },
    { name: 'Class 4', available: 100, sold: 425 }
  ];
  
  // Function to fetch real jobs from Supabase
  const fetchJobs = async () => {
    try {
      // Try to fetch from preferred schema first
      const { data: jobs, error } = await supabase
        .schema('neta_ops')
        .from('jobs')
        .select(`
          id,
          title,
          status,
          division,
          job_number,
          due_date,
          customer:customer_id (
            id,
            company_name,
            name
          )
        `)
        .eq('division', division)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log('Schema not found, trying fallback schema...');
          // Try common schema if neta_ops fails
          const { data: fallbackJobs, error: fallbackError } = await supabase
            .from('jobs')
            .select(`
              id,
              title,
              status,
              division,
              job_number,
              due_date,
              customer:customer_id (
                id,
                company_name,
                name
              )
            `)
            .eq('division', division)
            .order('created_at', { ascending: false })
            .limit(10);
            
          if (fallbackError) {
            throw fallbackError;
          }
          
          return fallbackJobs || [];
        } else {
          throw error;
        }
      }
      
      return jobs || [];
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      setError(null);
      
      // In a real implementation, fetch data from Supabase
      const loadData = async () => {
        try {
          // Fetch real jobs from Supabase
          const jobsData = await fetchJobs();
          
          // For now, still use sample data for inventory metrics
          setGlovesSold(2705);
          setGlovesAvailable(872);
          setQuarterlyOrders(sampleQuarterlyData);
          setQuarterlyData(sampleQuarterlyData);
          setMonthlyData(sampleMonthlyData);
          setGloveTypes(sampleGloveTypes);
          
          // Process real jobs data
          setRecentJobs(jobsData.map((job: any) => ({
            id: job.id,
            title: job.title,
            status: job.status,
            division: job.division,
            job_number: job.job_number,
            due_date: job.due_date,
            customers: {
              company_name: job.customer?.company_name || null,
              name: job.customer?.name || 'Unknown Customer'
            }
          })));
          
          // Set job metrics using real data
          setActiveJobs(jobsData.filter((job: any) => job.status === 'in_progress').length);
          setUpcomingJobs(jobsData.filter((job: any) => job.status === 'pending').length);
          setCompletedJobs(jobsData.filter((job: any) => job.status === 'completed').length);
          
          // Calculate total inventory
          let totalSold = 0;
          let totalAvailable = 0;
          sampleGloveTypes.forEach(type => {
            totalSold += type.sold;
            totalAvailable += type.available;
          });
          
          setGlovesSold(totalSold);
          setGlovesAvailable(totalAvailable);
          
        } catch (err: any) {
          console.error(`Armadillo Dashboard - Error loading data:`, err);
          setError(err.message || 'Failed to load dashboard data.');
        } finally {
          setLoading(false);
        }
      };

      loadData();
    } else {
      setLoading(false);
    }
  }, [user, division, yearFilter]);

  // Filter data based on selected glove type
  useEffect(() => {
    if (selectedGloveType === "all") {
      setQuarterlyData(sampleQuarterlyData);
      setMonthlyData(sampleMonthlyData);
      
      // Calculate totals
      let totalSold = 0;
      let totalAvailable = 0;
      sampleGloveTypes.forEach(type => {
        totalSold += type.sold;
        totalAvailable += type.available;
      });
      
      setGlovesSold(totalSold);
      setGlovesAvailable(totalAvailable);
    } else {
      // This would filter real data based on the selected type
      // For now, we'll just reduce the numbers as a simulation
      const selectedType = sampleGloveTypes.find(type => type.name === selectedGloveType);
      if (selectedType) {
        setGlovesSold(selectedType.sold);
        setGlovesAvailable(selectedType.available);
        
        // Apply a multiplier to quarterly and monthly data based on the type's proportion
        const proportion = selectedType.sold / 2705; // 2705 is the total from all types
        
        const adjustedQuarterlyData = sampleQuarterlyData.map(item => ({
          ...item,
          orders: Math.round(item.orders * proportion),
          revenue: Math.round(item.revenue * proportion)
        }));
        
        const adjustedMonthlyData = sampleMonthlyData.map(item => ({
          ...item,
          sold: Math.round(item.sold * proportion),
          available: Math.round(item.available * (selectedType.available / 872)) // 872 is the total available
        }));
        
        setQuarterlyData(adjustedQuarterlyData);
        setMonthlyData(adjustedMonthlyData);
      }
    }
  }, [selectedGloveType]);

  // Calculate quarterly totals
  const totalQuarterlyOrders = quarterlyData.reduce((sum, item) => sum + item.orders, 0);
  const totalQuarterlyRevenue = quarterlyData.reduce((sum, item) => sum + item.revenue, 0);

  // Colors for charts
  const COLORS = ['#f26722', '#8D5F3D', '#83C5BE', '#006D77', '#EE6C4D', '#293241'];

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  const gloveClassOptions = [
    { value: "all", label: "All Glove Classes" },
    ...sampleGloveTypes.map(type => ({ 
      value: type.name, 
      label: type.name 
    }))
  ];

  const yearOptions = [
    { value: "2023", label: "2023" },
    { value: "2024", label: "2024" }
  ];

  const handleGloveTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGloveType(e.target.value);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYearFilter(parseInt(e.target.value));
  };
  
  function getJobStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Armadillo Operations Dashboard</h1>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Select 
              value={selectedGloveType}
              onChange={handleGloveTypeChange}
              options={gloveClassOptions}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Select 
              value={yearFilter.toString()}
              onChange={handleYearChange}
              options={yearOptions}
            />
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gloves Available</p>
              <p className="text-3xl font-bold">{glovesAvailable.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Current inventory</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Package className="h-6 w-6 text-blue-700" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gloves Sold</p>
              <p className="text-3xl font-bold">{glovesSold.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Year to date</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <ShoppingBag className="h-6 w-6 text-green-700" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Orders by Quarter</p>
              <p className="text-3xl font-bold">{totalQuarterlyOrders.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">${totalQuarterlyRevenue.toLocaleString()} revenue</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Calendar className="h-6 w-6 text-purple-700" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Quarterly Orders Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Quarterly Orders ({yearFilter})</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'orders' ? value.toLocaleString() : `$${value.toLocaleString()}`,
                    name === 'orders' ? 'Orders' : 'Revenue'
                  ]} 
                />
                <Legend />
                <Bar dataKey="orders" name="Orders" fill="#8D5F3D" />
                <Bar dataKey="revenue" name="Revenue ($)" fill="#f26722" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Monthly Trends Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Monthly Inventory Trends</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sold" 
                  name="Gloves Sold" 
                  stroke="#f26722" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="available" 
                  name="Gloves Available" 
                  stroke="#8D5F3D" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      
      {/* Additional Data Views */}
      <Tabs defaultValue="quarterly" className="mb-8">
        <TabsList>
          <TabsTrigger value="quarterly">Quarterly Breakdown</TabsTrigger>
          <TabsTrigger value="inventory">Inventory by Class</TabsTrigger>
        </TabsList>
        
        <TabsContent value="quarterly" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Avg. Order Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quarterlyData.map((item) => (
                  <TableRow key={item.quarter}>
                    <TableCell className="font-medium">{item.quarter}</TableCell>
                    <TableCell className="text-right">{item.orders.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${item.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      ${(item.revenue / item.orders).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totalQuarterlyOrders.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${totalQuarterlyRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    ${(totalQuarterlyRevenue / totalQuarterlyOrders).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="inventory" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Gloves by Voltage Class</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gloveTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="sold"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {gloveTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toLocaleString()} units`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voltage Class</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Sell-Through Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gloveTypes.map((type) => (
                    <TableRow key={type.name}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell className="text-right">{type.available.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{type.sold.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {((type.sold / (type.sold + type.available)) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{glovesAvailable.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{glovesSold.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {((glovesSold / (glovesSold + glovesAvailable)) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Job Status Section */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Job Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeJobs}</p>
            </div>
            <div className="rounded-full bg-black/5 p-2">
              <Clock className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Upcoming Jobs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{upcomingJobs}</p>
            </div>
            <div className="rounded-full bg-black/5 p-2">
              <Calendar className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Completed Jobs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedJobs}</p>
            </div>
            <div className="rounded-full bg-black/5 p-2">
              <CheckCircle className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
      <Card>
        <Tabs defaultValue="jobs" className="w-full">
          <TabsList className="flex justify-between bg-transparent space-x-0 border-b">
            <TabsTrigger 
              className="data-[state=active]:border-b-2 data-[state=active]:border-accent-color data-[state=active]:text-accent-color data-[state=active]:shadow-none rounded-none bg-transparent flex-1 h-16 text-base"
              value="jobs"
            >
              <div className="flex flex-col items-center justify-center">
                <span>Recent Jobs</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {recentJobs.length} jobs
                </span>
              </div>
            </TabsTrigger>
            
            <TabsTrigger 
              className="data-[state=active]:border-b-2 data-[state=active]:border-accent-color data-[state=active]:text-accent-color data-[state=active]:shadow-none rounded-none bg-transparent flex-1 h-16 text-base"
              value="documents"
            >
              <div className="flex flex-col items-center justify-center">
                <span>Recent Documents</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {recentDocuments.length} documents
                </span>
              </div>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="jobs" className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {recentJobs.length === 0 ? (
                <div className="text-center py-6 text-gray-500">No recent jobs found</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentJobs.map((job) => (
                      <Link to={`/jobs/${job.id}`} key={job.id}>
                        <Card className="h-full hover:shadow-md transition-shadow duration-200 cursor-pointer">
                          <div className="p-4 flex flex-col h-full">
                            <div className="flex justify-between items-start">
                              <div>
                                <Badge className={getJobStatusColor(job.status)}>
                                  {job.status?.replace('_', ' ')}
                                </Badge>
                                {job.job_number && (
                                  <span className="text-xs text-gray-500 ml-2">#{formatLabJobNumber(job.job_number)}</span>
                                )}
                              </div>
                            </div>
                            <h3 className="font-medium text-lg mt-2">{job.title}</h3>
                            <div className="mt-2 text-sm text-gray-500">
                              <p>{job.customers.company_name || job.customers.name}</p>
                              {job.due_date && (
                                <p className="mt-1">Due: {formatDate(job.due_date)}</p>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="documents" className="p-6">
            <div className="text-center py-6 text-gray-500">No documents found</div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ArmadilloDashboard; 