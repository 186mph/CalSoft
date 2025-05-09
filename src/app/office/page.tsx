import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { PageLayout } from '@/components/ui/PageLayout';
import { 
  FileText, 
  DollarSign, 
  Building, 
  Calendar, 
  Users,
  Upload,
  DownloadCloud,
  FileSearch,
  Clock,
  CircleDollarSign,
  BarChart4,
  DoorOpen,
  Wrench,
  Package,
  CalendarCheck,
  Bell,
  UserRound,
  ClipboardList
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import DocumentManagement from '@/components/office/DocumentManagement';
import ExpenseTracking from '@/components/office/ExpenseTracking';
import FacilityManagement from '@/components/office/FacilityManagement';
import CalendarSystem from '@/components/office/CalendarSystem';
import VendorManagement from '@/components/office/VendorManagement';

// These components will be implemented in the next steps
const ExpensePlaceholder = () => (
  <Card>
    <CardContent className="pt-6">
      <p>Expense Tracking component is coming soon.</p>
    </CardContent>
  </Card>
);

const CalendarPlaceholder = () => (
  <Card>
    <CardContent className="pt-6">
      <p>Calendar component is coming soon.</p>
    </CardContent>
  </Card>
);

const OfficeAdministrationPortal: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('documents'); // Default tab
  
  // Sync with URL hash on component mount and hash changes
  useEffect(() => {
    const hashTab = location.hash.replace('#', '');
    
    if (hashTab && ['documents', 'expenses', 'facilities', 'calendar', 'vendors'].includes(hashTab)) {
      setActiveTab(hashTab);
    } else if (!location.hash && activeTab !== 'documents') {
      setActiveTab('documents');
    }
  }, [location.hash, activeTab]);

  // Update URL hash when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/office#${value}`, { replace: true });
  };

  return (
    <PageLayout
      title="Office Administration Portal"
      subtitle="Comprehensive office management and administration system"
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'Office Administration', to: '/office' },
      ]}
    >
      <div className="mb-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Office Dashboard</CardTitle>
            <CardDescription>
              Manage documents, track expenses, handle facilities, schedule events, and organize vendor information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">284</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Documents</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">32</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Expenses</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">18</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Maintenance Requests + Active</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">8</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Events + Active</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">5</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Contracts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-5 mb-8">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Expenses</span>
            <span className="sm:hidden">Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="facilities" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Facilities</span>
            <span className="sm:hidden">Facilities</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
            <span className="sm:hidden">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Vendors</span>
            <span className="sm:hidden">Vendors</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentManagement />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseTracking />
        </TabsContent>

        <TabsContent value="facilities">
          <FacilityManagement />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarSystem />
        </TabsContent>
        
        <TabsContent value="vendors">
          <VendorManagement />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default OfficeAdministrationPortal; 