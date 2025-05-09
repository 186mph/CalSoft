'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Edit, Trash2, Eye, Clock, PlusIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/Separator';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { JobCreationForm } from '@/components/jobs/JobCreationForm';

interface Customer {
  company_name?: string;
  name: string;
}

interface Job {
  id: string;
  job_number: string;
  title: string;
  status: string;
  start_date: string;
  due_date: string;
  budget: number;
  customer_id: string;
  created_at: string;
  customers: Customer;
  division: string;
}

export default function CalibrationJobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'calibration' | 'armadillo'>('all');

  // Redirect to portal if user is not authenticated
  useEffect(() => {
    if (!user || !user?.user_metadata?.divisions?.includes('Calibration')) {
      navigate('/portal');
    }
  }, [user, navigate]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
      }
    };

    checkUser();
  }, []);

  // Fetch NETA Technician jobs specific to the Calibration division
  useEffect(() => {
    fetchJobs(activeFilter);
  }, [refreshTrigger, activeFilter]);

  const fetchJobs = async (filter: 'all' | 'calibration' | 'armadillo' = 'all') => {
    try {
      setLoading(true);

      let query = supabase
        .schema('neta_ops')
        .from('jobs')
        .select(`
          id, job_number, title, status, start_date, due_date, budget, customer_id, created_at,
          customers:customer_id(company_name, name),
          division
        `)
        .eq('job_type', 'neta_technician')
        .order('created_at', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('division', filter);
      } else {
        query = query.in('division', ['calibration', 'armadillo']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching jobs:', error);
        return;
      }

      // Transform the data to match the Job interface
      const formattedJobs = data?.map(job => {
        // Transform nested array to object if needed
        const customerData = Array.isArray(job.customers) 
          ? (job.customers[0] || { name: '', company_name: '' })
          : (job.customers || { name: '', company_name: '' });
        
        return {
          ...job,
          customers: customerData as Customer
        };
      }) || [];

      setJobs(formattedJobs);
    } catch (err) {
      console.error('Error in fetchJobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJobCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center mb-4">
        <Link 
          to="/calibration/dashboard" 
          className="mr-4 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Calibration Division - NETA Technician Jobs</h1>
      </div>
      
      {/* The section below can be uncommented if you want additional job creation options */}
      {/* 
      <div className="mb-8 flex justify-center">
        <Button 
          onClick={() => document.getElementById('calibration-job-button')?.click()} 
          className="bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-8 px-12 rounded-xl shadow-xl transform hover:scale-105 transition-transform duration-200 relative animate-pulse"
          size="lg"
        >
          <span className="absolute -top-1 -right-1 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 items-center justify-center text-white text-xs">+</span>
          </span>
          <Plus className="h-8 w-8 mr-4" />
          ADD NEW JOB
        </Button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Create a New Job</h2>
        <div className="flex flex-wrap gap-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
          <div id="calibration-job-button">
            <JobCreationForm 
              division="calibration" 
              onJobCreated={handleJobCreated} 
              compact={true}
              buttonText="Create Calibration Job" 
            />
          </div>
          
          <JobCreationForm 
            division="armadillo" 
            onJobCreated={handleJobCreated} 
            compact={true}
            buttonText="Create Armadillo Job" 
          />
        </div>
      </div>
      */}
      
      {/* We're using a hidden element to store the actual form button */}
      <div className="hidden">
        <div id="calibration-job-button">
          <JobCreationForm 
            division="calibration" 
            onJobCreated={handleJobCreated} 
            compact={true}
          />
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Filter Jobs</h2>
        <div className="flex flex-wrap gap-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
          <Button variant="outline" className="flex items-center bg-white dark:bg-gray-700" onClick={() => setRefreshTrigger(prev => prev + 1)}>
            <Clock className="h-4 w-4 mr-2" />
            Refresh Jobs
          </Button>
          
          <div className="flex items-center">
            <span className="mr-2 text-sm font-medium">Show:</span>
            <select 
              className="px-4 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700" 
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'calibration' | 'armadillo')}
            >
              <option value="all">All Jobs</option>
              <option value="calibration">Calibration Jobs</option>
              <option value="armadillo">Armadillo Jobs</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Jobs List */}
      <Card className="bg-white dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">NETA Technician Jobs</h2>
          <Button 
            onClick={() => document.getElementById('calibration-job-button')?.click()} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Job
          </Button>
        </div>
        
        {loading ? (
          <div className="p-4 text-center">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mb-4 text-gray-500 dark:text-gray-400">
              No jobs found. Create a new job to get started.
            </div>
            <Button 
              onClick={() => document.getElementById('calibration-job-button')?.click()} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium mx-auto"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Job
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {jobs.map(job => (
              <div key={job.id} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {job.title}
                      </h3>
                      <Badge className={`ml-2 ${getStatusColor(job.status)}`}>
                        {job.status}
                      </Badge>
                      <Badge className="ml-2 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {job.division.charAt(0).toUpperCase() + job.division.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Job #{job.job_number} • {job.customers?.company_name || job.customers?.name || 'Unknown Customer'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                    <p className="text-sm flex items-center">
                      <Clock className="h-3 w-3 mr-1 text-gray-400" />
                      {formatDate(job.start_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                    <p className="text-sm flex items-center">
                      <Clock className="h-3 w-3 mr-1 text-gray-400" />
                      {formatDate(job.due_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                    <p className="text-sm">
                      {job.budget ? `$${job.budget.toLocaleString()}` : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
} 