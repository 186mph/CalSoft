import React, { useEffect, useState, useMemo, useLayoutEffect } from 'react';
import {
  BriefcaseIcon,
  CalendarIcon,
  CheckCircle,
  ChevronRight,
  Clock,
  Users,
  Users2,
  MapPin,
  Building,
  FileText,
  TrendingUp,
  DollarSign,
  BarChart,
  CheckCheck,
  Clipboard,
  AlertTriangle,
  Battery,
  ListChecks,
  PanelTop,
  AreaChart,
  Workflow,
  Plug,
  Wrench,
  FileLineChart,
  Gauge,
  Settings
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { supabase, isConnectionError, isSchemaError, tryWithFallbackSchema } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { NETAMetrics } from '@/components/metrics/NETAMetrics';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

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

interface CountsData {
  customers: number;
  contacts: number;
  jobs: number;
  activeJobs: number;
  upcomingJobs: number;
  completedJobs: number;
  opportunities?: number;
  awardedOpportunities?: number;
  documents?: number;
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

interface Opportunity {
  id: string;
  quote_number: string;
  title: string;
  status: string;
  expected_value: number | null;
  customers: {
    company_name?: string | null;
    name: string;
  };
}

interface DivisionDashboardProps {
  division: string;
  divisionName: string;
  showTechnicians?: boolean;
  showEquipment?: boolean;
  showCalibrations?: boolean;
  showDocumentation?: boolean;
  customMetrics?: any[];
  metricsComponent?: React.ReactNode;
}

export const DivisionDashboard: React.FC<DivisionDashboardProps> = ({
  division,
  divisionName,
  showTechnicians = false,
  showEquipment = false,
  showCalibrations = false,
  showDocumentation = false,
  customMetrics = [],
  metricsComponent
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats state
  const [counts, setCounts] = useState<CountsData>({
    customers: 0,
    contacts: 0,
    jobs: 0,
    activeJobs: 0,
    upcomingJobs: 0,
    completedJobs: 0,
    documents: 0
  });

  // Sample data for tabs that might not exist yet
  const technicians = useMemo(() => [], []);
  const equipment = useMemo(() => [], []);
  const calibrations = useMemo(() => [], []);

  // Scroll to top when the component mounts or division changes
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [division]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      setError(null);
      
      const loadData = async () => {
        try {
          // Load all necessary data
          const [countsData, jobs] = await Promise.all([
            fetchCounts(),
            fetchRecentJobs()
          ]);

          setCounts(countsData);
          
          // Transform and set jobs
          const transformedJobs = (jobs || []).map((job: any) => ({
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
          }));
          
          setRecentJobs(transformedJobs);

        } catch (err: any) {
          console.error(`${divisionName} Dashboard - Error loading data:`, err);
          setError(err.message || 'Failed to load dashboard data.');
        } finally {
          setLoading(false);
        }
      };

      loadData();
    } else {
      setLoading(false); // Not logged in, stop loading
    }
  }, [user, division, divisionName]);

  async function fetchCounts(): Promise<CountsData> {
    try {
      console.log(`${divisionName} Dashboard - Fetching counts for division:`, division);
      
      // Base queries
      const customersQuery = supabase.schema('common').from('customers').select('*', { count: 'exact', head: true });
      const contactsQuery = supabase.schema('common').from('contacts').select('*', { count: 'exact', head: true });
      let jobsQuery = supabase.schema('neta_ops').from('jobs').select('*', { count: 'exact', head: true });
      let activeJobsQuery = supabase.schema('neta_ops').from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress');
      let upcomingJobsQuery = supabase.schema('neta_ops').from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      let completedJobsQuery = supabase.schema('neta_ops').from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed');
      
      // Documents query
      let documentsQuery = supabase.schema('common').from('documents').select('*', { count: 'exact', head: true });
      
      // Initialize opportunity counts (will remain 0 if that module is disabled)
      const opportunitiesCount = 0;
      const awardedOpportunitiesCount = 0;
      let documentsCount = 0;
      
      // Add division filter for relevant queries
      jobsQuery = jobsQuery.eq('division', division);
      activeJobsQuery = activeJobsQuery.eq('division', division);
      upcomingJobsQuery = upcomingJobsQuery.eq('division', division);
      completedJobsQuery = completedJobsQuery.eq('division', division);
      
      // Add division filter to documents query if applicable
      if (showDocumentation) {
        documentsQuery = documentsQuery.eq('division', division);
      }
      
      // Log the queries being prepared
      console.log(`${divisionName} Dashboard - Preparing queries with schemas:`, {
        customers: 'common',
        contacts: 'common',
        jobs: 'neta_ops',
        opportunities: 'not used',
        documents: showDocumentation ? 'common' : 'not used'
      });
      
      // Handle opportunity counts - currently disabled
      // Uncomment and fix the condition below when we're ready to show opportunities
      /*
      if (showOpportunities) {
        try {
          const getOpportunityCounts = async (schema: string) => {
            const results = { total: 0, awarded: 0 };
            
            try {
              let totalQuery = supabase.schema(schema).from('opportunities').select('*', { count: 'exact', head: true });
              let awardedQuery = supabase.schema(schema).from('opportunities').select('*', { count: 'exact', head: true }).eq('status', 'awarded');
              
              // Try to apply division filter if that column exists
              try {
                const { data: columnInfo, error: columnError } = await supabase
                  .schema(schema)
                  .rpc('get_columns_info', { table_name: 'opportunities' });
                  
                if (!columnError && columnInfo) {
                  const hasColumn = columnInfo.some((col: any) => col.column_name === 'division');
                  if (hasColumn) {
                    console.log(`${divisionName} Dashboard - Applying division filter to opportunity counts`);
                    totalQuery = totalQuery.eq('division', division);
                    awardedQuery = awardedQuery.eq('division', division);
                  } else {
                    console.log(`${divisionName} Dashboard - Division column not found in opportunities table, skipping filter for counts`);
                  }
                }
              } catch (columnError) {
                console.warn(`${divisionName} Dashboard - Could not check if division column exists:`, columnError);
                // Continue without division filter
              }
              
              const [totalResult, awardedResult] = await Promise.all([totalQuery, awardedQuery]);
              
              if (totalResult.error) throw totalResult.error;
              if (awardedResult.error) throw awardedResult.error;
              
              results.total = totalResult.count || 0;
              results.awarded = awardedResult.count || 0;
            } catch (error) {
              if (isSchemaError(error)) {
                console.error(`Schema error in ${schema}.opportunities:`, error);
              } else {
                console.error(`Error fetching opportunity counts from ${schema}:`, error);
              }
              throw error;
            }
            
            return results;
          };
          
          const opportunityCounts = await tryWithFallbackSchema(getOpportunityCounts, 'business', 'common');
          opportunitiesCount = opportunityCounts.total;
          awardedOpportunitiesCount = opportunityCounts.awarded;
          
          console.log(`${divisionName} Dashboard - Fetched opportunity counts:`, {
            total: opportunitiesCount,
            awarded: awardedOpportunitiesCount
          });
        } catch (err) {
          console.error(`${divisionName} Dashboard - Error fetching opportunity counts:`, err);
          // Keep zeros for the counts
        }
      }
      */

      // Handle documents count
      if (showDocumentation) {
        try {
          const { count, error } = await documentsQuery;
          
          if (error) {
            if (isSchemaError(error)) {
              console.warn(`Schema error for documents table. It may not exist yet:`, error);
            } else {
              console.error(`Error fetching document counts:`, error);
            }
            // Keep zero for documents count on error
          } else {
            documentsCount = count || 0;
          }
        } catch (err) {
          console.error(`${divisionName} Dashboard - Error fetching document counts:`, err);
          // Keep zero for documents count
        }
      }

      // Prepare queries array for the base counts
      const queries = [
        customersQuery,
        contactsQuery,
        jobsQuery,
        activeJobsQuery,
        upcomingJobsQuery,
        completedJobsQuery
      ];
      
      console.log(`${divisionName} Dashboard - Executing ${queries.length} base queries`);
      
      // Execute all base queries in parallel
      const results = await Promise.all(queries);

      // Check for errors in results
      let hasSchemaErrors = false;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.error) {
          console.error(`${divisionName} Dashboard - Error fetching count for query #${i}:`, result.error);
          
          // Check specifically for schema-related errors
          if (isSchemaError(result.error)) {
            hasSchemaErrors = true;
          }
          
          if (isConnectionError(result.error)) {
            throw new Error('Unable to connect to the database. Please check your connection.');
          }
        }
      }
      
      // If we have schema errors, throw a specific error
      if (hasSchemaErrors) {
        console.error(`${divisionName} Dashboard - Schema-related errors detected. Database structure may be incorrect.`);
        throw new Error('Database schema error. The required tables may not exist or permissions may be incorrect.');
      }
      
      // Base counts - use 0 as fallback if errors occurred
      const countsData: CountsData = {
        customers: results[0].count || 0,
        contacts: results[1].count || 0,
        jobs: results[2].count || 0,
        activeJobs: results[3].count || 0,
        upcomingJobs: results[4].count || 0,
        completedJobs: results[5].count || 0
      };
      
      // Add documents count
      if (showDocumentation) {
        countsData.documents = documentsCount;
      }

      console.log(`${divisionName} Dashboard - Successfully fetched counts:`, countsData);
      return countsData;
    } catch (error) {
      console.error(`Unexpected error in ${divisionName} fetchCounts:`, error);
      // Return zeros for all counts in case of error, to prevent UI from breaking
      const defaultData: CountsData = {
        customers: 0,
        contacts: 0,
        jobs: 0,
        activeJobs: 0,
        upcomingJobs: 0,
        completedJobs: 0,
        documents: 0
      };
      // Re-throw to allow the component to show an error state
      throw error;
    }
  }
  
  async function fetchRecentJobs() {
    try {
      const query = supabase
        .schema('neta_ops')
        .from('jobs')
        .select(`
          id,
          title,
          status,
          division,
          job_number,
          due_date,
          customer_id
        `)
        .eq('division', division)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recent jobs:', error);
        throw error;
      }

      // Fetch customer data for each job
      const jobsWithCustomers = await Promise.all((data || []).map(async (job) => {
        if (!job.customer_id) {
          return { ...job, customer: null };
        }

        const { data: customerData, error: customerError } = await supabase
          .schema('common')
          .from('customers')
          .select('id, name, company_name')
          .eq('id', job.customer_id)
          .single();

        if (customerError) {
          console.warn(`Error fetching customer for job ${job.id}:`, customerError);
          return { ...job, customer: null };
        }

        return { ...job, customer: customerData };
      }));

      return jobsWithCustomers;
    } catch (error) {
      console.error(`Unexpected error in ${divisionName} fetchRecentJobs:`, error);
      throw error;
    }
  }

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

  // Check if the division is one with special metrics
  const hasCustomMetricsComponent = ['calibration', 'armadillo', 'scavenger'].includes(division);

  // Add formatDate helper function
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Check if the division is a NETA division
  const isNETADivision = ['north_alabama', 'tennessee', 'georgia', 'international'].includes(division);

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-md">
          Error loading dashboard: {error}
        </div>
      )}
      
      {/* Title section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900">
          {divisionName} Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-dark-400">
          {`Welcome to the ${divisionName} portal`}
        </p>
      </div>
      
      {/* Quick Actions Section - Add for NETA Divisions */}
      {isNETADivision && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md hover:border-green-200 transition-all cursor-pointer">
            <Link to={`/${division}/equipment`} className="block p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-50 rounded-full mr-3">
                    <Wrench className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Equipment Management</h3>
                    <p className="text-sm text-gray-600">Track, assign, and maintain equipment</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </Card>
          
          <Card className="hover:shadow-md hover:border-orange-200 transition-all cursor-pointer">
            <Link to={`/${division}/maintenance`} className="block p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-50 rounded-full mr-3">
                    <Wrench className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Equipment Maintenance</h3>
                    <p className="text-sm text-gray-600">Schedule and track maintenance</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </Card>
          
          <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
            <Link to={`/${division}/profiles`} className="block p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-50 rounded-full mr-3">
                    <Users className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Technician Profiles</h3>
                    <p className="text-sm text-gray-600">Manage skills and certifications</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </Card>
          
          <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
            <Link to={`/${division}/jobs`} className="block p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-amber-50 rounded-full mr-3">
                    <BriefcaseIcon className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Job Management</h3>
                    <p className="text-sm text-gray-600">View and manage jobs</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </Card>
          
          <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
            <Link to={`/${division}/reports`} className="block p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-green-50 rounded-full mr-3">
                    <FileText className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Report Management</h3>
                    <p className="text-sm text-gray-600">Manage and approve reports</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </Card>
        </div>
      )}
      
      {/* 1. Performance Metrics Section - For NETA divisions use NETAMetrics, otherwise use provided component */}
      {metricsComponent ? (
        <div className="mb-12">
          {metricsComponent}
        </div>
      ) : !hasCustomMetricsComponent && (
        <div className="mb-12">
          <NETAMetrics division={division} />
        </div>
      )}
      
      {/* Performance metrics placeholder for special divisions with no metrics component */}
      {hasCustomMetricsComponent && !metricsComponent && <div className="mb-12"></div>}

      {/* 2. Core Business Metrics (Customers, Contacts, Documents) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 mt-12">
        {/* Customers Card */}
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts.customers}</p>
              <Link to={`/customers?division=${division}`}>
                <Button variant="ghost" size="sm" className="mt-2 h-8 px-0 text-xs text-[#f26722] hover:text-[#f26722]/90 dark:text-[#f26722] dark:hover:text-[#f26722]/90">
                  View all customers
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <Building className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>

        {/* Contacts Card */}
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Contacts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts.contacts}</p>
              <Link to={`/contacts?division=${division}`}>
                <Button variant="ghost" size="sm" className="mt-2 h-8 px-0 text-xs text-[#f26722] hover:text-[#f26722]/90 dark:text-[#f26722] dark:hover:text-[#f26722]/90">
                  View all contacts
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <Users2 className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>

        {/* Documents Card (conditionally shown) */}
        {showDocumentation && (
          <Card>
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Documents</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts.documents}</p>
                <Link to={`/documents?division=${division}`}>
                  <Button variant="ghost" size="sm" className="mt-2 h-8 px-0 text-xs text-[#f26722] hover:text-[#f26722]/90 dark:text-[#f26722] dark:hover:text-[#f26722]/90">
                    View all documents
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <div className="rounded-md bg-black/5 p-2">
                <FileText className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 3. Job Status Section */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Job Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts.activeJobs}</p>
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts.upcomingJobs}</p>
            </div>
            <div className="rounded-full bg-black/5 p-2">
              <CalendarIcon className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Completed Jobs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts.completedJobs}</p>
            </div>
            <div className="rounded-full bg-black/5 p-2">
              <CheckCircle className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Recent Activity Tabs */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
      <Card>
        <Tabs defaultValue="jobs" className="w-full">
          <TabsList className="flex justify-between bg-transparent space-x-0 border-b">
            <TabsTrigger 
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#f26722] data-[state=active]:text-[#f26722] data-[state=active]:shadow-none rounded-none bg-transparent flex-1 h-16 text-base"
              value="jobs"
            >
              <div className="flex flex-col items-center justify-center">
                <span>Recent Jobs</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {recentJobs.length} jobs
                </span>
              </div>
            </TabsTrigger>
            
            {showDocumentation && (
              <TabsTrigger 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#f26722] data-[state=active]:text-[#f26722] data-[state=active]:shadow-none rounded-none bg-transparent flex-1 h-16 text-base"
                value="documents"
              >
                <div className="flex flex-col items-center justify-center">
                  <span>Recent Documents</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {recentJobs.length} documents
                  </span>
                </div>
              </TabsTrigger>
            )}
            
            {showTechnicians && (
              <TabsTrigger 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#f26722] data-[state=active]:text-[#f26722] data-[state=active]:shadow-none rounded-none bg-transparent flex-1 h-16 text-base"
                value="technicians"
              >
                <div className="flex flex-col items-center justify-center">
                  <span>Technicians</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {technicians.length} technicians
                  </span>
                </div>
              </TabsTrigger>
            )}

            {showEquipment && (
              <TabsTrigger 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#f26722] data-[state=active]:text-[#f26722] data-[state=active]:shadow-none rounded-none bg-transparent flex-1 h-16 text-base"
                value="equipment"
              >
                <div className="flex flex-col items-center justify-center">
                  <span>Equipment</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {equipment.length} items
                  </span>
                </div>
              </TabsTrigger>
            )}

            {showCalibrations && (
              <TabsTrigger 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#f26722] data-[state=active]:text-[#f26722] data-[state=active]:shadow-none rounded-none bg-transparent flex-1 h-16 text-base"
                value="calibrations"
              >
                <div className="flex flex-col items-center justify-center">
                  <span>Calibrations</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {calibrations.length} calibrations
                  </span>
                </div>
              </TabsTrigger>
            )}
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
                                <p className="font-medium text-[#f26722] truncate">{job.title}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {job.customers?.company_name || job.customers?.name || 'No customer'}
                                </p>
                              </div>
                              <Badge 
                                className={`
                                  px-2 py-1 text-xs font-normal whitespace-nowrap
                                  ${job.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                                  ${job.status === 'in-progress' || job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : ''}
                                  ${job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                `}
                              >
                                {job.status?.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            
                            <div className="flex justify-between mt-auto pt-3 text-sm text-gray-500 border-t border-gray-100 mt-3">
                              <div className="flex items-center">
                                <BriefcaseIcon className="h-3.5 w-3.5 mr-1" />
                                {formatLabJobNumber(job.job_number) || 'No number'}
                              </div>
                              {/* Due date is optional */}
                              {job.due_date && (
                                <div className="flex items-center">
                                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                                  {formatDate(job.due_date)}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                  
                  <div className="flex justify-center mt-6">
                    <Link to={`/jobs?division=${division}`}>
                      <Button variant="outline" size="sm">
                        View all jobs
                        <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          {showDocumentation && (
            <TabsContent value="documents">
              <Card>
                <div className="p-4 text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-medium mb-2">Documentation Module</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Access to division-specific documentation and files.
                  </p>
                  <Button>Browse Documentation</Button>
                </div>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </Card>
    </div>
  );
};

export default DivisionDashboard;