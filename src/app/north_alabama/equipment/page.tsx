import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { EquipmentTracking } from '@/components/equipment/EquipmentTracking';

export default function NETAEquipmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to portal if user is not authenticated
  React.useEffect(() => {
    if (!user || !user?.user_metadata?.divisions?.includes('North Alabama')) {
      navigate('/portal');
    }
  }, [user, navigate]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold border-b pb-3">North Alabama Division Equipment Tracking</h1>
      <EquipmentTracking division="North Alabama" />
    </div>
  );
} 