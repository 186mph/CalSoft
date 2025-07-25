import React, { useEffect, useState } from 'react';
import { PageLayout } from '@/components/ui/PageLayout';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Clock, CalendarClock, Users, Award, Layers } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useAuth } from '@/lib/AuthContext';
import { useDivision } from '@/App'; // Import from App.tsx instead of DivisionContext.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { PortalType } from '@/lib/types/scheduling';
import { TechnicianCalendar } from '@/components/scheduling/TechnicianCalendar';
import { TechnicianScheduleManagement } from '@/components/scheduling/TechnicianScheduleManagement';
import { JobAssignmentManagement } from '@/components/scheduling/JobAssignmentManagement';

interface TechCalendarProps {
  portalType: PortalType;
  division?: string;
  viewOnly?: boolean;
  showAllTechnicians?: boolean;
}

export default function SchedulingPage() {
  const params = useParams();
  const { user } = useAuth();
  const { division, setDivision } = useDivision();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('calendar');
  const [portalType, setPortalType] = useState<PortalType>('neta');
  
  useEffect(() => {
    if (params.division && params.division !== division) {
      setDivision(params.division as string);
    }
  }, [params.division, division, setDivision]);

  useEffect(() => {
    if (division) {
      if (['north_alabama', 'tennessee', 'georgia', 'international'].includes(division)) {
        setPortalType('neta');
      } else if (['calibration', 'armadillo'].includes(division)) {
        setPortalType('lab');
      } else if (division === 'scavenger') {
        setPortalType('scavenger');
      }
    }
  }, [division]);

  const canAccessScheduler = user?.user_metadata?.role === 'Admin' || 
                             user?.user_metadata?.role?.includes('Scheduler') || 
                             user?.user_metadata?.role?.includes('Technician'); 

  useEffect(() => {
    if (!user || !canAccessScheduler) {
      console.warn('User not logged in or does not have permission.');
      navigate('/portal');
    }
  }, [user, canAccessScheduler, navigate]);

  if (!division || !user || !canAccessScheduler) {
    return <div>Loading or checking access...</div>;
  }

  const formattedDivision = division
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <PageLayout title={`${formattedDivision} Division - Scheduling`}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formattedDivision} Division - Scheduling
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage technician availability and job assignments
            </p>
          </div>
          
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Set Availability
            </Button>
            <Button>
              <CalendarClock className="mr-2 h-4 w-4" />
              Schedule Job
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full mr-4">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Technicians</p>
                  <h3 className="text-2xl font-bold">12</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full mr-4">
                  <CalendarClock className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled Jobs</p>
                  <h3 className="text-2xl font-bold">24</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full mr-4">
                  <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Skills Tracked</p>
                  <h3 className="text-2xl font-bold">18</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full mr-4">
                  <Layers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Jobs This Week</p>
                  <h3 className="text-2xl font-bold">8</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="technicians">Technicians</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="assignments">Job Assignments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="mt-6">
            <TechnicianCalendar 
              portalType={portalType}
              division={division}
              showAllTechnicians={true}
            />
          </TabsContent>
          
          <TabsContent value="technicians" className="mt-6">
            <TechnicianScheduleManagement 
              portalType={portalType}
              division={division}
            />
          </TabsContent>
          
          <TabsContent value="skills" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Skills & Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 dark:text-gray-400">
                  Manage skills, proficiency levels, and certification requirements.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="assignments" className="mt-6">
            <JobAssignmentManagement 
              portalType={portalType}
              division={division}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
} 