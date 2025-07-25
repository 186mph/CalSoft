import React, { useLayoutEffect } from 'react';
import { Truck, Wrench, HardHat } from 'lucide-react';
import DivisionDashboard from '../../components/dashboards/DivisionDashboard';

export const NorthAlabamaDashboard: React.FC = () => {
  // Scroll to top when the component mounts
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Division-specific custom metrics
  const customMetrics = [
    {
      name: 'Service Vehicles',
      value: 12,
      icon: <Truck className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Equipment Utilization',
      value: '87%',
      icon: <Wrench className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Field Technicians',
      value: 18,
      icon: <HardHat className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    }
  ];

  return (
    <DivisionDashboard
      division="north_alabama"
      divisionName="North Alabama Division"
      showTechnicians={true}
      showDocumentation={true}
      customMetrics={customMetrics}
    />
  );
};

// Add both export styles to ensure compatibility with different import methods
export default NorthAlabamaDashboard; 