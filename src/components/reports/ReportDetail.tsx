import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we should return to the assets page
  const returnToAssets = new URLSearchParams(location.search).get('returnToAssets') === 'true';
  
  // Extract the job ID from the URL (assuming format is /jobs/:jobId/...)
  const jobId = location.pathname.split('/')[2];
  
  // Function to navigate back to the job assets tab
  const goBackToJobAssets = () => {
    if (jobId) {
      navigate(`/jobs/${jobId}?tab=assets`);
    } else {
      navigate(-1);
    }
  };
  
  // Handle form submission - this function would be called when saving the report
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save report logic would go here
    // ...
    
    // After saving, redirect back to the job assets tab
    if (returnToAssets) {
      goBackToJobAssets();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button that conditionally returns to job assets */}
      {returnToAssets && (
        <button
          onClick={goBackToJobAssets}
          className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Job Assets
        </button>
      )}
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        {/* ... existing code ... */}
      </div>
    </div>
  );
};

export default ReportDetail; 