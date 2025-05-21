import React, { useLayoutEffect } from 'react';
import { MapPin, Users, Building, BarChart3 } from 'lucide-react';
import DivisionDashboard from '../../components/dashboards/DivisionDashboard';

export const GeorgiaDashboard: React.FC = () => {
  // Scroll to top when the component mounts
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Division-specific custom metrics
  const customMetrics = [
    {
      name: 'Service Areas',
      value: 24,
      icon: <MapPin className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Team Size',
      value: 14,
      icon: <Users className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Customer Sites',
      value: 168,
      icon: <Building className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    }
  ];

  return (
    <DivisionDashboard
      division="georgia"
      divisionName="Georgia Division"
      showTechnicians={true}
      showDocumentation={true}
      customMetrics={customMetrics}
    />
  );
};

// Add both export styles to ensure compatibility with different import methods
export default GeorgiaDashboard; 