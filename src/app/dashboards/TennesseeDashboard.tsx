import React, { useLayoutEffect } from 'react';
import { Battery, Clock, PercentIcon, Bolt } from 'lucide-react';
import DivisionDashboard from '../../components/dashboards/DivisionDashboard';

export const TennesseeDashboard: React.FC = () => {
  // Scroll to top when the component mounts
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Division-specific custom metrics
  const customMetrics = [
    {
      name: 'Avg Response Time',
      value: '3.2h',
      icon: <Clock className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Completion Rate',
      value: '94%',
      icon: <PercentIcon className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Power Systems',
      value: 32,
      icon: <Bolt className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    }
  ];

  return (
    <DivisionDashboard
      division="tennessee"
      divisionName="Tennessee Division"
      showTechnicians={true}
      showDocumentation={true}
      customMetrics={customMetrics}
    />
  );
};

// Add both export styles to ensure compatibility with different import methods
export default TennesseeDashboard; 