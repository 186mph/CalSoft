import React from 'react';
import { useJobDetails } from '../hooks';

interface JobInfoHeaderProps {
  jobId: string;
  onJobDetailsLoaded?: (details: {
    customer: string;
    address: string;
    jobNumber: string;
  }) => void;
}

/**
 * A component that displays job info and also automatically passes job details
 * to parent components via the onJobDetailsLoaded callback
 */
export function JobInfoHeader({ jobId, onJobDetailsLoaded }: JobInfoHeaderProps) {
  console.log("JobInfoHeader: Component rendering", { jobId });
  
  const { jobDetails, loading, error, getFormattedInfoForReports } = useJobDetails(jobId);
  
  console.log("JobInfoHeader: Current state", {
    hasJobDetails: !!jobDetails,
    loading,
    hasError: !!error,
    jobId
  });
  
  React.useEffect(() => {
    console.log("JobInfoHeader: useEffect triggered", {
      hasJobDetails: !!jobDetails,
      hasCallback: !!onJobDetailsLoaded
    });
    
    if (jobDetails && onJobDetailsLoaded) {
      // Get formatted details for the inspection report format
      const formattedDetails = getFormattedInfoForReports();
      
      if (formattedDetails) {
        console.log("JobInfoHeader: passing formatted details to parent:", formattedDetails);
        onJobDetailsLoaded({
          customer: formattedDetails.customer,
          address: formattedDetails.address,
          jobNumber: formattedDetails.jobNumber
        });
      }
    }
  }, [jobDetails, onJobDetailsLoaded, getFormattedInfoForReports]);
  
  if (loading) {
    console.log("JobInfoHeader: Showing loading state");
    return <div className="text-sm text-gray-500 dark:text-dark-400">Loading job information...</div>;
  }
  
  if (error || !jobDetails) {
    console.log("JobInfoHeader: Showing error state", { error });
    return <div className="text-sm text-red-500 dark:text-red-400">Error loading job information</div>;
  }
  
  // Get formatted info for consistent display
  const formattedInfo = getFormattedInfoForReports();
  if (!formattedInfo) {
    console.log("JobInfoHeader: Job information is incomplete");
    return <div className="text-sm text-amber-500 dark:text-amber-400">Job information is incomplete</div>;
  }
  
  console.log("JobInfoHeader: Rendering complete info", formattedInfo);
  
  return (
    <div className="job-info-header bg-gray-50 dark:bg-dark-800 p-4 rounded-md border border-gray-200 dark:border-dark-600 mb-4">
      <div className="flex flex-wrap gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-400">Job #</h3>
          <p className="text-sm font-bold text-gray-900 dark:text-dark-100">{formattedInfo.jobNumber}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-400">Title</h3>
          <p className="text-sm font-bold text-gray-900 dark:text-dark-100">{formattedInfo.title}</p>
        </div>
        
        <div className="flex-grow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-400">Customer</h3>
          <p className="text-sm font-bold text-gray-900 dark:text-dark-100">{formattedInfo.customer}</p>
        </div>
        
        <div className="flex-grow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-400">Address</h3>
          <p className="text-sm font-bold text-gray-900 dark:text-dark-100">{formattedInfo.address}</p>
        </div>
      </div>
    </div>
  );
} 