import React, { useLayoutEffect } from 'react';
import { Truck, Recycle, BarChart, Package } from 'lucide-react';
import DivisionDashboard from '../../components/dashboards/DivisionDashboard';
import ScavengerMetrics from '../../components/metrics/ScavengerMetrics';

export const ScavengerDashboard: React.FC = () => {
  // Scroll to top when the component mounts
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Division-specific custom metrics
  const customMetrics = [
    {
      name: 'Material Processed',
      value: '42t',
      icon: <Recycle className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Recovery Rate',
      value: '87.9%',
      icon: <BarChart className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    },
    {
      name: 'Inventory Value',
      value: '$168K',
      icon: <Package className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
    }
  ];

  return (
    <DivisionDashboard
      division="scavenger"
      divisionName="Scavenger Division"
      showTechnicians={true}
      showDocumentation={true}
      customMetrics={customMetrics}
      metricsComponent={<ScavengerMetrics division="scavenger" />}
    />
  );
};

// Add both export styles to ensure compatibility with different import methods
export default ScavengerDashboard; 