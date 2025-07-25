import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useDivision } from '@/App';
import { PageLayout } from '@/components/ui/PageLayout';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { QualityMetrics } from '@/components/lab/QualityMetrics';
import { PortalType } from '@/lib/types/scheduling';

export default function ReportsPage() {
  const params = useParams();
  const { user } = useAuth();
  const { division, setDivision } = useDivision();
  const navigate = useNavigate();
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

  // Check access permissions
  const canAccessReports = user?.user_metadata?.role === 'Admin' || 
                          user?.user_metadata?.role?.includes('Manager');

  useEffect(() => {
    if (!user || !canAccessReports) {
      console.warn('User not logged in or does not have permission to access reports.');
      navigate('/portal');
    }
  }, [user, canAccessReports, navigate]);

  if (!division || !user || !canAccessReports) {
    return <div>Loading or checking access...</div>;
  }

  const formattedDivision = division
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <PageLayout
      title={`${formattedDivision} Division - Reports`}
      subtitle="Generate and view operational reports and metrics"
    >
      <Tabs defaultValue="quality" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance Reports</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics</CardTitle>
              <CardDescription>Generate quality assurance reports and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <QualityMetrics division={division} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Reports</CardTitle>
              <CardDescription>View technician and team performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Performance reporting features coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scheduling">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Reports</CardTitle>
              <CardDescription>Generate scheduling efficiency and utilization reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Scheduling reporting features coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
} 