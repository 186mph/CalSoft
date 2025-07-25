import React, { useLayoutEffect } from 'react';
import { Globe, Languages, Building, Map } from 'lucide-react';
import DivisionDashboard from '../../components/dashboards/DivisionDashboard';

export const InternationalDashboard: React.FC = () => {
  // Scroll to top when the component mounts
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Division-specific custom metrics
  const customMetrics = [
    {
      name: 'Countries Served',
      value: 14,
      icon: <Globe className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Local Partners',
      value: 23,
      icon: <Building className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Project Regions',
      value: 8,
      icon: <Map className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    }
  ];

  return (
    <DivisionDashboard
      division="international"
      divisionName="International Division"
      showTechnicians={true}
      showDocumentation={true}
      customMetrics={customMetrics}
    />
  );
};

// Add both export styles to ensure compatibility with different import methods
export default InternationalDashboard; 