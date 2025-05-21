import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { EquipmentCalibration } from '@/components/lab/EquipmentCalibration';
import { CertificateGenerator } from '@/components/lab/CertificateGenerator';
import { TestingProcedures } from '@/components/lab/TestingProcedures';
import { QualityMetrics } from '@/components/lab/QualityMetrics';
import { JobCreationForm } from '@/components/jobs/JobCreationForm';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clipboard } from 'lucide-react';

export default function CalibrationDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to portal if user is not authenticated
  React.useEffect(() => {
    if (!user || !user?.user_metadata?.divisions?.includes('Calibration')) {
      navigate('/portal');
    }
  }, [user, navigate]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold border-b pb-3">Calibration Division Dashboard</h1>
      
      {/* Add JobCreationForm for NETA Technician jobs */}
      <JobCreationForm division="calibration" />
      
      {/* Add Job List Link */}
      <Card className="p-4 mb-6 bg-white dark:bg-dark-100 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Job Management</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              View and manage all NETA Technician jobs for Calibration division
            </p>
          </div>
          <Button onClick={() => navigate('/calibration/jobs')}>
            <Clipboard className="h-4 w-4 mr-2" />
            View Job List
          </Button>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <EquipmentCalibration division="Calibration" />
        </div>
        <div>
          <CertificateGenerator division="Calibration" />
        </div>
        <div>
          <TestingProcedures division="Calibration" />
        </div>
        <div>
          <QualityMetrics division="Calibration" />
        </div>
      </div>
    </div>
  );
} 