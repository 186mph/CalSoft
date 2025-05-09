/**
 * Utility functions for report components
 */

/**
 * Navigates back to the job details page, optionally directly to the assets tab
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
  
  // Check if the URL contains the returnToAssets parameter
  const searchParams = new URLSearchParams(location.search);
  const returnToAssets = searchParams.get('returnToAssets') === 'true';
  
  // Navigate back to job assets tab if returnToAssets is true, otherwise just to job details
  if (returnToAssets) {
    navigate(`/jobs/${jobId}?tab=assets`);
  } else {
    navigate(`/jobs/${jobId}`);
  }
}; 