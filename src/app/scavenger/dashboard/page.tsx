import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { JobCreationForm } from '@/components/jobs/JobCreationForm';

export default function ScavengerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to portal if user is not authenticated
  React.useEffect(() => {
    if (!user || !user?.user_metadata?.divisions?.includes('Scavenger')) {
      navigate('/portal');
    }
  }, [user, navigate]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold border-b pb-3">Scavenger Division Dashboard</h1>
      
      {/* Add JobCreationForm for NETA Technician jobs */}
      <JobCreationForm division="scavenger" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add Scavenger-specific components here */}
      </div>
    </div>
  );
} 