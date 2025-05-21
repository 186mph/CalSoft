import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useDivision } from '@/App';
import { PageLayout } from '@/components/ui/PageLayout';
import MaintenanceSchedule from '@/components/equipment/MaintenanceSchedule';
import { PortalType } from '@/lib/types/scheduling';

export default function MaintenancePage() {
  const params = useParams();
  const { user } = useAuth();
  const { division, setDivision } = useDivision();
  const navigate = useNavigate();
  const [portalType, setPortalType] = useState<PortalType>('neta');
  
  useEffect(() => {
    if (params.division && params.division !== division) {
      setDivision(params.division as string);
    }
  }, [params.division, division, setDivision]);

  useEffect(() => {
    if (division) {
      if (['north_alabama', 'tennessee', 'georgia', 'international'].includes(division)) {
        setPortalType('neta');
      } else if (['calibration', 'armadillo'].includes(division)) {
        setPortalType('lab');
      } else if (division === 'scavenger') {
        setPortalType('scavenger');
      }
    }
  }, [division]);

  // Check user permissions
  const canAccessEquipment = user?.user_metadata?.role === 'Admin' || 
                             user?.user_metadata?.permissions?.includes('equipment_manage') || 
                             user?.user_metadata?.permissions?.includes('equipment_view');

  useEffect(() => {
    if (!user || !canAccessEquipment) {
      console.warn('User not logged in or does not have permission to access equipment maintenance.');
      navigate('/portal');
    }
  }, [user, canAccessEquipment, navigate]);

  if (!division || !user || !canAccessEquipment) {
    return <div>Loading or checking access...</div>;
  }

  const formattedDivision = division
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <PageLayout
      title={`${formattedDivision} Equipment Maintenance`}
      subtitle="Manage equipment maintenance schedules and service records"
      breadcrumbs={[
        { label: 'Portal', to: '/portal' },
        { label: formattedDivision, to: `/${division}` },
        { label: 'Maintenance', to: `/${division}/maintenance` }
      ]}
    >
      <MaintenanceSchedule 
        division={division} 
        portal={portalType}
      />
    </PageLayout>
  );
} 