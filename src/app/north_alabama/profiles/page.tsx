import React from 'react';
import { TechnicianProfileManagement } from '@/components/profile/TechnicianProfileManagement';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function NETAProfilesPage() {
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
      <h1 className="text-2xl font-bold mb-6 px-4">North Alabama Division - Technician Profiles</h1>
      <TechnicianProfileManagement portalType="neta" division="north_alabama" />
    </div>
  );
} 