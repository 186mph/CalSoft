import React from 'react';
import { ScheduleManagement } from '@/components/scheduling/ScheduleManagement';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TennesseeSchedulePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect non-authorized users
  React.useEffect(() => {
    if (user && !['Admin', 'Scheduler', 'NETA Technician'].includes(user.user_metadata?.role)) {
      navigate('/portal');
    }
  }, [user, navigate]);

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6 px-4">Tennessee Division - Technician Scheduling</h1>
      <ScheduleManagement portalType="neta" division="tennessee" />
    </div>
  );
} 