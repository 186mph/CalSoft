import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Trash2, FileText, Calendar, User, ExternalLink, Search, Filter, RotateCcw, Package, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Asset {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
  asset_id?: string;
  job_id: string;
  job_number: string;
  job_title: string;
  deleted_at?: string;
}

export default function DeletedAssetsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states - same as All Assets page
  const [searchQuery, setSearchQuery] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [jobNumberFilter, setJobNumberFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Check admin permissions
  useEffect(() => {
    if (!user || user.user_metadata?.role !== 'Admin') {
      console.warn('User does not have admin permissions to view deleted assets');
      navigate('/calibration/all-assets');
      return;
    }
  }, [user, navigate]);

  // Fetch deleted assets
  const fetchDeletedAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching deleted calibration assets...');

      let allDeletedAssets: Asset[] = [];

      // First, let's test if we can query the lab_assets table at all
      console.log('Testing basic lab_assets access...');
      const { data: testQuery, error: testError } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .select('id, deleted_at')
        .limit(5);

      if (testError) {
        console.error('Error with basic lab_assets query:', testError);
        setError(`Database access error: ${testError.message}`);
        return;
      } else {
        console.log('Basic lab_assets query successful:', testQuery);
        console.log('Sample deleted_at values:', testQuery?.map(item => ({ id: item.id, deleted_at: item.deleted_at })));
      }

      // Strategy 1: Look for assets from deleted jobs...
      console.log('Strategy 1: Looking for assets from deleted jobs...');
      const { data: deletedJobs, error: deletedJobsError } = await supabase
        .schema('lab_ops')
        .from('lab_jobs')
        .select('id, job_number, title, updated_at')
        .eq('status', 'deleted')
        .order('updated_at', { ascending: false });

      if (deletedJobsError) {
        console.error('Error fetching deleted jobs:', deletedJobsError);
      } else {
        console.log(`Found ${deletedJobs?.length || 0} deleted jobs:`, deletedJobs);
        if (deletedJobs && deletedJobs.length > 0) {
        console.log(`Found ${deletedJobs.length} deleted job(s)`);
        
        const deletedJobIds = deletedJobs.map(job => job.id);
        
        const { data: deletedJobAssets, error: deletedJobAssetsError } = await supabase
          .schema('lab_ops')
          .from('lab_assets')
          .select('*')
          .in('job_id', deletedJobIds)
          .order('created_at', { ascending: false });

        if (deletedJobAssetsError) {
          console.error('Error fetching assets from deleted jobs:', deletedJobAssetsError);
        } else if (deletedJobAssets) {
          // Create a job lookup map from deleted jobs
          const jobLookup = (deletedJobs || []).reduce((acc, job) => {
            acc[job.id] = job;
            return acc;
          }, {} as Record<string, any>);

          // Transform deleted job assets
          const transformedDeletedJobAssets: Asset[] = deletedJobAssets.map((item: any) => {
            const jobInfo = jobLookup[item.job_id];
            return {
              id: item.id,
              name: item.name,
              file_url: item.file_url,
              created_at: item.created_at,
              asset_id: item.asset_id,
              job_id: item.job_id || '',
              job_number: jobInfo?.job_number || '',
              job_title: jobInfo?.title || '',
              deleted_at: jobInfo?.updated_at || item.updated_at
            };
          });

          allDeletedAssets = [...allDeletedAssets, ...transformedDeletedJobAssets];
          }
        }
      }

      // Strategy 2: Look for soft-deleted assets (assets with deleted_at timestamp)
      console.log('Strategy 2: Looking for soft-deleted assets...');
      const { data: softDeletedAssets, error: softDeletedError } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .select('*')
        .not('deleted_at', 'is', null) // Look for assets with deleted_at timestamp
        .order('deleted_at', { ascending: false });

      console.log('Soft-deleted assets query result:', { 
        data: softDeletedAssets, 
        error: softDeletedError, 
        count: softDeletedAssets?.length 
      });

      if (softDeletedError) {
        console.error('Error fetching soft-deleted assets:', softDeletedError);
        console.error('Soft delete error details:', {
          message: softDeletedError.message,
          details: softDeletedError.details,
          hint: softDeletedError.hint,
          code: softDeletedError.code
        });
      } else if (softDeletedAssets && softDeletedAssets.length > 0) {
        console.log(`Found ${softDeletedAssets.length} soft-deleted asset(s)`);
        
        // Get job IDs for the soft-deleted assets
        const jobIds = [...new Set(softDeletedAssets.map((asset: any) => asset.job_id).filter(Boolean))];
        
        let jobsData: any[] = [];
        if (jobIds.length > 0) {
          const { data: jobs, error: jobsError } = await supabase
            .schema('lab_ops')
            .from('lab_jobs')
            .select('id, job_number, title')
            .in('id', jobIds);

          if (jobsError) {
            console.error('Error fetching job details for soft-deleted assets:', jobsError);
          } else {
            jobsData = jobs || [];
          }
        }

        // Create a job lookup map
        const jobLookup = jobsData.reduce((acc, job) => {
          acc[job.id] = job;
          return acc;
        }, {} as Record<string, any>);

        // Transform soft-deleted assets
        const transformedSoftDeletedAssets: Asset[] = softDeletedAssets.map((item: any) => {
          const jobInfo = jobLookup[item.job_id];
          return {
            id: item.id,
            name: item.name,
            file_url: item.file_url,
            created_at: item.created_at,
            asset_id: item.asset_id,
            job_id: item.job_id || '',
            job_number: jobInfo?.job_number || '',
            job_title: jobInfo?.title || '',
            deleted_at: item.deleted_at
          };
        });

        allDeletedAssets = [...allDeletedAssets, ...transformedSoftDeletedAssets];
      } else {
        console.log('No soft-deleted assets found in lab_assets table');
      }

      // Remove duplicates (in case an asset appears in both strategies)
      const uniqueDeletedAssets = allDeletedAssets.filter((asset, index, self) => 
        index === self.findIndex(a => a.id === asset.id)
      );

      console.log(`Found ${uniqueDeletedAssets.length} total deleted assets`);

      if (uniqueDeletedAssets.length === 0) {
        console.log('No deleted assets found. This could be because:');
        console.log('1. No jobs have been marked with status="deleted"');
        console.log('2. No assets have been soft-deleted (deleted_at field)');
        console.log('3. All assets are currently active');
        console.log('4. The deleted_at column might not exist in the database');
      }

      setAssets(uniqueDeletedAssets);
      setFilteredAssets(uniqueDeletedAssets);
    } catch (error: any) {
      console.error('Error fetching deleted assets:', error);
      setError(`Failed to load deleted assets: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter assets based on search criteria - same logic as All Assets
  useEffect(() => {
    let filtered = assets;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.asset_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.job_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Report type filter
    if (reportTypeFilter !== 'all') {
      filtered = filtered.filter(asset => {
        const reportType = getSimplifiedReportType(asset);
        return reportType === reportTypeFilter;
      });
    }

    // Job number filter
    if (jobNumberFilter) {
      filtered = filtered.filter(asset =>
        asset.job_number?.toLowerCase().includes(jobNumberFilter.toLowerCase())
      );
    }

    // Date filter
    if (selectedDate) {
      filtered = filtered.filter(asset => {
        const assetDate = new Date(asset.created_at).toISOString().split('T')[0];
        return assetDate === selectedDate;
      });
    }

    setFilteredAssets(filtered);
  }, [assets, searchQuery, reportTypeFilter, jobNumberFilter, selectedDate]);

  useEffect(() => {
    if (user?.user_metadata?.role === 'Admin') {
      fetchDeletedAssets();
    }
  }, [user]);

  // Function to determine the simplified report type from the file_url - same as All Assets
  const getSimplifiedReportType = (asset: Asset) => {
    if (asset.file_url.startsWith('report:')) {
      const urlParts = asset.file_url.split('/');
      const reportSlug = urlParts[3];
      
      if (reportSlug) {
        const cleanReportSlug = reportSlug.split('?')[0];
        
        const reportTypeMap: { [key: string]: string } = {
          'calibration-gloves': 'Glove',
          'calibration-sleeve': 'Sleeve',
          'calibration-blanket': 'Blanket',
          'calibration-line-hose': 'Line Hose',
          'calibration-hotstick': 'Hotstick',
          'calibration-ground-cable': 'Ground Cable',
          'calibration-bucket-truck': 'Bucket Truck',
  'calibration-digger': 'Digger'
        };
        
        return reportTypeMap[cleanReportSlug] || 'Report';
      }
    }
    
    return 'Document';
  };

  const getReportEditPath = (asset: Asset) => {
    if (asset.file_url.startsWith('report:')) {
      const urlParts = asset.file_url.split('/');
      const jobId = urlParts[2];
      const reportSlug = urlParts[3];
      const reportId = urlParts[4];
      
      // Build the correct path with reportId as a path parameter (not query string)
      const reportPath = `/jobs/${jobId}/${reportSlug}${reportId ? `/${reportId}` : ''}`;
      // Add returnPath parameter to tell the report to return to Deleted Assets
      return `${reportPath}?returnPath=/calibration/deleted-assets`;
    }
    return asset.file_url;
  };

  const resetFilters = () => {
    setSearchQuery('');
    setReportTypeFilter('all');
    setJobNumberFilter('');
    setSelectedDate('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAssetIcon = (asset: Asset) => {
    if (asset.file_url.includes('report:') || asset.name.toLowerCase().includes('report')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const handleRestoreAsset = async (asset: Asset) => {
    try {
      console.log('Restoring asset:', asset);
      
      // Remove the deleted_at timestamp to restore the asset
      const { error } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .update({ deleted_at: null })
        .eq('id', asset.id);

      if (error) {
        console.error('Error restoring asset:', error);
        alert(`Failed to restore asset: ${error.message}`);
        return;
      }

      // Remove the asset from local state (it should no longer appear in deleted assets)
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      setFilteredAssets(prev => prev.filter(a => a.id !== asset.id));
      
      alert(`Asset "${asset.name}" has been successfully restored!`);
      
      console.log('Asset restored successfully');
    } catch (error: any) {
      console.error('Error restoring asset:', error);
      alert(`Failed to restore asset: ${error.message || 'Unknown error'}`);
    }
  };

  const handlePermanentDelete = async (asset: Asset) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${asset.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      console.log('Permanently deleting asset:', asset);
      
      // Permanently delete the asset record
      const { error } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .delete()
        .eq('id', asset.id);

      if (error) {
        console.error('Error permanently deleting asset:', error);
        alert(`Failed to permanently delete asset: ${error.message}`);
        return;
      }

      // Remove the asset from local state
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      setFilteredAssets(prev => prev.filter(a => a.id !== asset.id));
      
      alert(`Asset "${asset.name}" has been permanently deleted.`);
      
      console.log('Asset permanently deleted successfully');
    } catch (error: any) {
      console.error('Error permanently deleting asset:', error);
      alert(`Failed to permanently delete asset: ${error.message || 'Unknown error'}`);
    }
  };

  // Redirect non-admin users
  if (!user || user.user_metadata?.role !== 'Admin') {
    return (
      <div className="p-6 flex justify-center">
        <div className="max-w-md w-full text-center">
          <Trash2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need administrator privileges to view deleted assets.
          </p>
          <Button onClick={() => navigate('/calibration/all-assets')}>
            Return to All Assets
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="max-w-7xl w-full">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading deleted assets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex justify-center">
        <div className="max-w-7xl w-full">
          <div className="text-center py-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button 
                onClick={fetchDeletedAssets}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex justify-center">
      <div className="max-w-7xl w-full space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Trash2 className="mr-3 h-6 w-6 text-red-500" />
              Archived
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage deleted calibration assets (Admin Only)
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={fetchDeletedAssets}
              disabled={loading}
              variant="secondary"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters Section - Same as All Assets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search assets, Asset ID, job..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-[#339C5E]/30 focus:border-[#339C5E] rounded-lg placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none transition-colors duration-200"
              />
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Type
              </label>
              <select
                value={reportTypeFilter}
                onChange={(e) => setReportTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#339C5E]"
              >
                <option value="all">All Types</option>
                <option value="Glove">Glove</option>
                <option value="Sleeve">Sleeve</option>
                <option value="Blanket">Blanket</option>
                <option value="Line Hose">Line Hose</option>
                <option value="Hotstick">Hotstick</option>
                <option value="Ground Cable">Ground Cable</option>
                <option value="Bucket Truck">Bucket Truck</option>
              </select>
            </div>

            {/* Job Number Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Number
              </label>
              <input
                type="text"
                placeholder="Filter by job number..."
                value={jobNumberFilter}
                onChange={(e) => setJobNumberFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-[#339C5E]/30 focus:border-[#339C5E] rounded-lg placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none transition-colors duration-200"
              />
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Created Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#339C5E]"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
            >
              Reset Filters
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredAssets.length} of {assets.length} deleted assets
            </p>
          </div>
        </div>

        {/* Assets List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deleted Assets</h3>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="p-8 text-center">
              <Trash2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No deleted assets found
              </p>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {assets.length === 0 
                  ? "No assets have been deleted yet. Assets will appear here when jobs are marked as deleted or when individual assets are removed."
                  : "Try adjusting your filters to see more results."
                }
              </p>
              {assets.length === 0 && (
                <div className="text-sm text-gray-400 dark:text-gray-500 mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-medium mb-2">Deleted assets will show here when:</p>
                  <ul className="text-left space-y-1">
                    <li>• Jobs are marked with status "deleted"</li>
                    <li>• Assets are soft-deleted (if deleted_at field exists)</li>
                    <li>• Individual assets are removed from the system</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Asset ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Report Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Job Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Deleted Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getAssetIcon(asset)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {asset.asset_id || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {asset.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {getSimplifiedReportType(asset)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {asset.job_number}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {asset.job_title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(asset.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {asset.deleted_at ? formatDate(asset.deleted_at) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {asset.file_url.startsWith('report:') ? (
                            <a
                              href={getReportEditPath(asset)}
                              className="text-[#339C5E] hover:text-[#2d8a54] hover:underline inline-flex items-center"
                            >
                              <Eye className="h-5 w-5" />
                              <span className="ml-1">View Report</span>
                            </a>
                          ) : (
                            <a
                              href={asset.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#339C5E] hover:text-[#2d8a54] hover:underline inline-flex items-center"
                            >
                              <Eye className="h-5 w-5" />
                              <span className="ml-1">View</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleRestoreAsset(asset)}
                            className="text-[#339C5E] hover:text-[#2d8a54] hover:underline inline-flex items-center"
                          >
                            <RotateCcw className="h-5 w-5" />
                            <span className="ml-1">Restore</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(asset)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:underline inline-flex items-center"
                          >
                            <Trash2 className="h-5 w-5" />
                            <span className="ml-1">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {!loading && !error && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                Showing {filteredAssets.length} of {assets.length} deleted assets
              </span>
              <span>
                Admin access required for this page
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 