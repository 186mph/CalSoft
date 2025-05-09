import React from 'react';
import { useParams } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';

const TechnicianProfilesPage: React.FC = () => {
  const { division } = useParams<{ division: string }>();
  
  return (
    <PageLayout
      title="Technician Profiles"
      subtitle="View and manage technician profiles and certifications"
    >
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow-sm p-6">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Technician profiles management component will be implemented here.
        </p>
      </div>
    </PageLayout>
  );
};

export default TechnicianProfilesPage; 