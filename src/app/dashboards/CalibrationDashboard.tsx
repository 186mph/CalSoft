import React, { useLayoutEffect } from 'react';
import { Ruler, BarChart, AlertCircle, CreditCard } from 'lucide-react';
import DivisionDashboard from '../../components/dashboards/DivisionDashboard';
import CalibrationMetrics from '../../components/metrics/CalibrationMetrics';

export const CalibrationDashboard: React.FC = () => {
  // Scroll to top when the component mounts
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Division-specific custom metrics
  const customMetrics = [
    {
      name: 'Equipment Calibrated',
      value: 187,
      icon: <Ruler className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Calibration Accuracy',
      value: '99.4%',
      icon: <BarChart className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Pending Calibrations',
      value: 43,
      icon: <AlertCircle className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    }
  ];

  return (
    <DivisionDashboard
      division="calibration"
      divisionName="Calibration Division"
      showTechnicians={true}
      showDocumentation={true}
      customMetrics={customMetrics}
      metricsComponent={<CalibrationMetrics division="calibration" />}
    />
  );
};

// Add default export to maintain compatibility with import statements
export default CalibrationDashboard; 