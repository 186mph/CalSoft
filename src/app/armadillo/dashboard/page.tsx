import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { EquipmentCalibration } from '@/components/lab/EquipmentCalibration';
import { CertificateGenerator } from '@/components/lab/CertificateGenerator';
import { TestingProcedures } from '@/components/lab/TestingProcedures';
import { QualityMetrics } from '@/components/lab/QualityMetrics';
import { JobCreationForm } from '@/components/jobs/JobCreationForm';

export default function ArmadilloDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to portal if user is not authenticated
  React.useEffect(() => {
    if (!user || !user?.user_metadata?.divisions?.includes('Armadillo')) {
      navigate('/portal');
    }
  }, [user, navigate]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold border-b pb-3">Armadillo Division Dashboard</h1>
      
      {/* Add JobCreationForm for NETA Technician jobs */}
      <JobCreationForm division="armadillo" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <EquipmentCalibration division="Armadillo" />
        </div>
        <div>
          <CertificateGenerator division="Armadillo" />
        </div>
        <div>
          <TestingProcedures division="Armadillo" />
        </div>
        <div>
          <QualityMetrics division="Armadillo" />
        </div>
      </div>
    </div>
  );
} 