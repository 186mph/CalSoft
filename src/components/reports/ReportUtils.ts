/**
 * Utility functions for report components
 */

/**
 * Navigates back to the job details page, optionally directly to the assets tab,
 * or back to a specific parent report like a bucket truck report
 * @param navigate - The navigate function from useNavigate
 * @param jobId - The ID of the job to navigate back to
 * @param location - The location object from useLocation
 */
export const navigateAfterSave = (
  navigate: (path: string) => void,
  jobId: string | undefined,
  location: { search: string }
) => {
  if (!jobId) return;
  
  const searchParams = new URLSearchParams(location.search);
  const returnToAssets = searchParams.get('returnToAssets') === 'true';
  const returnToReport = searchParams.get('returnToReport');
  const returnToReportType = searchParams.get('returnToReportType');
  
  // Check if we should navigate back to a bucket truck report
  if (returnToReport && returnToReportType === 'bucket-truck') {
    if (returnToReport === 'new') {
      // Navigate back to a new bucket truck report
      navigate(`/jobs/${jobId}/calibration-bucket-truck`);
    } else {
      // Navigate back to a specific bucket truck report
      navigate(`/jobs/${jobId}/calibration-bucket-truck/${returnToReport}`);
    }
    return;
  }
  
  // Check if the URL contains the returnToAssets parameter
  if (returnToAssets) {
    navigate(`/jobs/${jobId}?tab=assets`);
  } else {
    navigate(`/jobs/${jobId}`);
  }
}; 