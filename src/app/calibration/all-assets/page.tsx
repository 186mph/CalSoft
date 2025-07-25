import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import { Eye, Package, Search, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';

interface Asset {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
  asset_id?: string;
  userAssetId?: string;
  job_id: string;
  job_number?: string;
  job_title?: string;
  pass_fail_status?: 'PASS' | 'FAIL' | null;
}

interface SupabaseAsset {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
  asset_id?: string;
}

interface SupabaseJob {
  id: string;
  job_number?: string;
  title?: string;
}

interface SupabaseJobAsset {
  asset_id: string;
  assets: SupabaseAsset | null;
  jobs: SupabaseJob | null;
}

export default function AllAssetsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [passFailFilter, setPassFailFilter] = useState('all');
  const [jobNumberFilter, setJobNumberFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  // Function to fetch pass/fail status for assets from calibration report tables
  const fetchPassFailStatus = async (assets: Asset[]): Promise<Asset[]> => {
    const assetsWithStatus = await Promise.all(
      assets.map(async (asset) => {
        try {
          // Extract report type from file_url to determine which table to query
          if (!asset.file_url.startsWith('report:')) {
            return { ...asset, pass_fail_status: null };
          }

          const urlParts = asset.file_url.split('/');
          const reportSlug = urlParts[3]?.split('?')[0];
          
          if (!reportSlug) {
            return { ...asset, pass_fail_status: null };
          }

          // Map report slugs to table names and status paths
          const reportTableMap: { [key: string]: { table: string; statusPath: string } } = {
            'calibration-gloves': { table: 'calibration_gloves_reports', statusPath: 'gloveData.passFailStatus' },
            'calibration-sleeve': { table: 'calibration_sleeve_reports', statusPath: 'sleeveData.passFailStatus' },
            'calibration-blanket': { table: 'calibration_blanket_reports', statusPath: 'blanketData.passFailStatus' },
            'calibration-line-hose': { table: 'calibration_line_hose_reports', statusPath: 'lineHoseData.passFailStatus' },
            'calibration-hotstick': { table: 'calibration_hotstick_reports', statusPath: 'hotstickData.passFailStatus' },
            'calibration-ground-cable': { table: 'calibration_ground_cable_reports', statusPath: 'groundCableData.passFailStatus' },
            'calibration-bucket-truck': { table: 'calibration_bucket_truck_reports', statusPath: 'bucketTruckData.passFailStatus' }
          };

          const reportConfig = reportTableMap[reportSlug];
          if (!reportConfig) {
            return { ...asset, pass_fail_status: null };
          }

          // Extract report ID from file_url (last part after the report type)
          const reportId = urlParts[4]?.split('?')[0];
          if (!reportId) {
            return { ...asset, pass_fail_status: null };
          }

          // Query the specific calibration report table
          const { data: reportData, error } = await supabase
            .schema('lab_ops')
            .from(reportConfig.table)
            .select('report_info')
            .eq('id', reportId)
            .single();

          if (error || !reportData?.report_info) {
            return { ...asset, pass_fail_status: null };
          }

          // Extract pass/fail status from the nested JSON structure
          const reportInfo = reportData.report_info;
          const statusPath = reportConfig.statusPath.split('.');
          let passFailStatus = reportInfo;
          
          for (const key of statusPath) {
            passFailStatus = passFailStatus?.[key];
          }

          // Ensure we only return valid pass/fail status values
          const validStatus: 'PASS' | 'FAIL' | null = 
            passFailStatus === 'PASS' ? 'PASS' : 
            passFailStatus === 'FAIL' ? 'FAIL' : null;

          return { 
            ...asset, 
            pass_fail_status: validStatus 
          };
        } catch (error) {
          console.error(`Error fetching pass/fail status for asset ${asset.id}:`, error);
          return { ...asset, pass_fail_status: null };
        }
      })
    );

    return assetsWithStatus;
  };

  // Fetch all assets
  const fetchAllAssets = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching all calibration assets...');

      // Fetch lab assets (calibration division assets)
      const { data: labAssetsData, error: labAssetsError } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .select('*')
        .is('deleted_at', null) // Only get active assets (not soft-deleted)
        .order('created_at', { ascending: false });

      console.log('Lab assets query result:', { data: labAssetsData, error: labAssetsError });

      if (labAssetsError) {
        console.error('Error fetching lab assets:', labAssetsError);
        throw labAssetsError;
      }

      if (!labAssetsData || labAssetsData.length === 0) {
        console.log('No lab assets found');
        setAssets([]);
        setFilteredAssets([]);
        return;
      }

      console.log(`Found ${labAssetsData.length} lab assets`);

      // Get unique job IDs from the assets
      const jobIds = [...new Set(labAssetsData.map(asset => asset.job_id).filter(Boolean))];
      console.log('Unique job IDs:', jobIds);

      // Fetch job details for these job IDs - only include active/existing jobs
      let jobsData: any[] = [];
      if (jobIds.length > 0) {
        const { data: jobs, error: jobsError } = await supabase
          .schema('lab_ops')
          .from('lab_jobs')
          .select('id, job_number, title, status')
          .in('id', jobIds)
          .not('status', 'eq', 'deleted'); // Exclude deleted jobs if status field exists

        if (jobsError) {
          console.error('Error fetching job details:', jobsError);
          // Continue without job details rather than failing
        } else {
          jobsData = jobs || [];
          console.log(`Found ${jobsData.length} active job details`);
        }
      }

      // Create a job lookup map (only for existing jobs)
      const jobLookup = jobsData.reduce((acc, job) => {
        acc[job.id] = job;
        return acc;
      }, {} as Record<string, any>);

      // Transform lab assets with job information - only include assets with valid jobs
      const transformedLabAssets: Asset[] = labAssetsData
        .filter((item: any) => {
          // Only include assets that have a corresponding job
          return item.job_id && jobLookup[item.job_id];
        })
        .map((item: any) => {
          const jobInfo = jobLookup[item.job_id];
          return {
            id: item.id,
            name: item.name,
            file_url: item.file_url,
            created_at: item.created_at,
            asset_id: item.asset_id,
            job_id: item.job_id || '',
            job_number: jobInfo?.job_number || '',
            job_title: jobInfo?.title || ''
          };
        });

      console.log(`Transformed ${transformedLabAssets.length} assets for display`);

      // Fetch pass/fail status for each asset
      const assetsWithStatus = await fetchPassFailStatus(transformedLabAssets);

      setAssets(assetsWithStatus);
      setFilteredAssets(assetsWithStatus);
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      setError(`Failed to load assets: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter assets based on search criteria
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

    // Pass/Fail filter
    if (passFailFilter !== 'all') {
      filtered = filtered.filter(asset => {
        if (passFailFilter === 'pending') {
          return !asset.pass_fail_status;
        }
        return asset.pass_fail_status === passFailFilter;
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
  }, [assets, searchQuery, reportTypeFilter, passFailFilter, jobNumberFilter, selectedDate]);

  useEffect(() => {
    fetchAllAssets();
  }, []);

  // Function to determine the simplified report type from the file_url
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
          'calibration-bucket-truck': 'Bucket Truck'
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
      
      // Build the correct path with reportId as a URL parameter (not query string)
      const reportPath = `/jobs/${jobId}/${reportSlug}${reportId ? `/${reportId}` : ''}`;
      // Add returnPath parameter to tell the report to return to All Assets
      return `${reportPath}?returnPath=/calibration/all-assets`;
    }
    return asset.file_url;
  };

  const resetFilters = () => {
    setSearchQuery('');
    setReportTypeFilter('all');
    setPassFailFilter('all');
    setJobNumberFilter('');
    setSelectedDate('');
  };

  // Handle asset deletion
  const handleDeleteAsset = async (asset: Asset) => {
    try {
      // Soft delete the asset by setting deleted_at timestamp
      const { error } = await supabase
        .schema('lab_ops')
        .from('lab_assets')
        .update({ 
          deleted_at: new Date().toISOString()
        })
        .eq('id', asset.id);

      if (error) {
        console.error('Error deleting asset:', error);
        alert('Failed to delete asset. Please try again.');
        return;
      }

      // Remove the asset from local state
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      setFilteredAssets(prev => prev.filter(a => a.id !== asset.id));
      
      // Close the confirmation dialog
      setShowDeleteConfirm(false);
      setAssetToDelete(null);
      
      alert('Asset deleted successfully!');
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="max-w-7xl w-full">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#339C5E] mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading all assets...</p>
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
                onClick={fetchAllAssets}
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              All Assets
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Master list of all calibration assets across all jobs
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

            {/* Pass/Fail Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pass/Fail Status
              </label>
              <select
                value={passFailFilter}
                onChange={(e) => setPassFailFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#339C5E]"
              >
                <option value="all">All Status</option>
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
                <option value="pending">Pending</option>
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
              Showing {filteredAssets.length} of {assets.length} assets
            </p>
          </div>
        </div>

        {/* Assets List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assets</h3>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No assets found
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {assets.length === 0 
                  ? "No assets have been created yet."
                  : "Try adjusting your filters to see more results."
                }
              </p>
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
                      Pass/Fail
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {asset.userAssetId || asset.asset_id || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {getSimplifiedReportType(asset)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <Link 
                          to={`/jobs/${asset.job_id}`}
                          className="text-[#339C5E] hover:text-[#2d8a54] hover:underline"
                        >
                          {asset.job_number || '-'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {asset.pass_fail_status ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              asset.pass_fail_status === 'PASS'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                            }`}
                          >
                            {asset.pass_fail_status}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {format(new Date(asset.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end space-x-3">
                          {asset.file_url.startsWith('report:') ? (
                            <Link 
                              to={getReportEditPath(asset)}
                              className="text-[#339C5E] hover:text-[#2d8a54] hover:underline inline-flex items-center"
                            >
                              <Eye className="h-5 w-5" />
                              <span className="ml-1">View Report</span>
                            </Link>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0 h-auto focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssetToDelete(asset);
                              setShowDeleteConfirm(true);
                            }}
                            title="Delete Asset"
                          >
                            <Trash2 className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Asset</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{assetToDelete?.name}"? This action will move the asset to the archived list and cannot be undone from this view.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAssetToDelete(null);
                }}
                className="flex items-center px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:bg-[#339C5E]/10 hover:text-[#339C5E] dark:hover:bg-[#339C5E]/20 focus:outline-none focus:!ring-2 focus:!ring-[#339C5E] focus:!ring-offset-2 active:!ring-2 active:!ring-[#339C5E] active:!ring-offset-2"
              >
                Cancel
              </button>
              <Button 
                variant="destructive"
                onClick={() => assetToDelete && handleDeleteAsset(assetToDelete)}
              >
                Delete Asset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}