import React, { useEffect, useState } from 'react';
import { PageLayout } from '@/components/ui/PageLayout';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Clock, CalendarClock, Users, Award, Layers } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useAuth } from '@/lib/AuthContext';
import { useDivision } from '@/lib/DivisionContext';
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

  // Redirect non-authorized users
  useEffect(() => {
    if (user && !['Admin', 'Scheduler', 'NETA Technician'].includes(user.user_metadata?.role)) {
      navigate('/portal');
    }
  }, [user, navigate]);

  if (!division || !user || !canAccessScheduler) {
    return <div>Loading or checking access...</div>;
  }

  const formattedDivision = division
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Mock data for the dashboard cards
  const dashboardCards = [
    {
      title: 'Technicians',
      value: '12',
      icon: <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Scheduled Today',
      value: '6',
      icon: <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />,
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Pending Approvals',
      value: '3',
      icon: <CalendarClock className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
      bgColor: 'bg-amber-100 dark:bg-amber-900/20'
    },
    {
      title: 'Jobs This Week',
      value: '8',
      icon: <Layers className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    }
  ];

  return (
    <PageLayout
      title={`${formattedDivision} Division - Scheduling`}
      subtitle="Manage technician scheduling, assignments, and resource allocation"
      actions={
        <Button onClick={() => console.log('Add new')}>
          Add New Assignment
        </Button>
      }
    >
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {dashboardCards.map((card, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className={`p-2 ${card.bgColor} rounded-full mr-4`}>
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
                    <h3 className="text-2xl font-bold">{card.value}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                <CardTitle>Technician Skills & Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 dark:text-gray-400">
                  Manage and track technician skills, certifications, and proficiency levels.
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