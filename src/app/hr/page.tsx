import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { PageLayout } from '@/components/ui/PageLayout';
import { Users, BookOpen, Award, LineChart, FileText, Heart } from 'lucide-react';
import BenefitsManagement from '@/components/hr/BenefitsManagement';
import EmployeeRecordManagement from '@/components/hr/EmployeeRecordManagement';
import CertificationManagement from '@/components/hr/CertificationManagement';
import TrainingTracking from '@/components/hr/TrainingTracking';
import PolicyManagement from '@/components/hr/PolicyManagement';
import PerformanceReviewSystem from '@/components/hr/PerformanceReviewSystem';
import { useLocation, useNavigate } from 'react-router-dom';

const HRPortal: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('benefits'); // Default tab
  
  // Sync with URL hash on component mount and hash changes
  useEffect(() => {
    // Extract the tab name from the URL hash (remove the # character)
    const hashTab = location.hash.replace('#', '');
    
    // If there's a valid tab in the URL, set it as active
    if (hashTab && ['employees', 'training', 'certifications', 'performance', 'benefits', 'policies'].includes(hashTab)) {
      setActiveTab(hashTab);
    } else if (!location.hash && activeTab !== 'benefits') {
      // If no hash and not already on default tab, set default
      setActiveTab('benefits');
    }
  }, [location.hash]);

  // Update URL hash when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/hr#${value}`, { replace: true });
  };

  return (
    <PageLayout
      title="HR Portal"
      subtitle="Comprehensive human resources management system"
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'HR Portal', to: '/hr' },
      ]}
    >
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>HR Portal Dashboard</CardTitle>
            <CardDescription>
              Manage employee records, training, certifications, performance reviews, benefits, and company policies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">128</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Employees</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">14</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Open Positions</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">23</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Training Sessions</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">7</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Reviews</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">12</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Certs</p>
              </div>
              <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">6</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Benefit Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-6 mb-8">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Employee Records</span>
            <span className="sm:hidden">Employees</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Training</span>
            <span className="sm:hidden">Training</span>
          </TabsTrigger>
          <TabsTrigger value="certifications" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Certifications</span>
            <span className="sm:hidden">Certs</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Performance Reviews</span>
            <span className="sm:hidden">Reviews</span>
          </TabsTrigger>
          <TabsTrigger value="benefits" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Benefits</span>
            <span className="sm:hidden">Benefits</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Policies</span>
            <span className="sm:hidden">Policies</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeeRecordManagement />
        </TabsContent>

        <TabsContent value="training">
          <TrainingTracking />
        </TabsContent>

        <TabsContent value="certifications">
          <CertificationManagement />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceReviewSystem />
        </TabsContent>
        
        <TabsContent value="benefits">
          <BenefitsManagement />
        </TabsContent>

        <TabsContent value="policies">
          <PolicyManagement />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default HRPortal; 