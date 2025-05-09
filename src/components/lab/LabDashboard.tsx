import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Activity,
  Microscope,
  FileText,
  Award,
  Clipboard,
  BarChart2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { labService, LabEquipment, Certificate, QualityMetric } from '@/lib/services/labService';

interface LabDashboardProps {
  division?: string;
}

export function LabDashboard({ division }: LabDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dashboard data
  const [equipmentStats, setEquipmentStats] = useState({
    total: 0,
    calibrationDue: 0,
    calibrationUpcoming: 0,
    outOfService: 0
  });
  
  const [certificateStats, setCertificateStats] = useState({
    total: 0,
    issuedThisMonth: 0,
    expiringSoon: 0,
    expired: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<{
    type: 'equipment' | 'certificate' | 'procedure' | 'metric',
    name: string,
    date: string,
    action: string
  }[]>([]);
  
  const [qualityMetricsSummary, setQualityMetricsSummary] = useState<{
    total: number,
    withinThreshold: number,
    belowThreshold: number,
    aboveThreshold: number
  }>({
    total: 0,
    withinThreshold: 0,
    belowThreshold: 0,
    aboveThreshold: 0
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Get equipment stats
        const equipmentResponse = await labService.getEquipment();
        if (!equipmentResponse.error && equipmentResponse.data) {
          const equipment = equipmentResponse.data;
          
          const now = new Date();
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(now.getDate() + 30);
          
          const calibrationDue = equipment.filter(item => {
            if (!item.next_calibration_date) return false;
            const nextCalDate = new Date(item.next_calibration_date);
            return nextCalDate <= now;
          });
          
          const calibrationUpcoming = equipment.filter(item => {
            if (!item.next_calibration_date) return false;
            const nextCalDate = new Date(item.next_calibration_date);
            return nextCalDate > now && nextCalDate <= thirtyDaysFromNow;
          });
          
          const outOfService = equipment.filter(item => item.status === 'out-of-service');
          
          setEquipmentStats({
            total: equipment.length,
            calibrationDue: calibrationDue.length,
            calibrationUpcoming: calibrationUpcoming.length,
            outOfService: outOfService.length
          });
        }
        
        // Get certificate stats
        const certResponse = await labService.getCertificates();
        if (!certResponse.error && certResponse.data) {
          const certificates = certResponse.data;
          
          const now = new Date();
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(now.getDate() + 30);
          
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          const issuedThisMonth = certificates.filter(cert => {
            const issueDate = new Date(cert.issued_date);
            return issueDate >= firstDayOfMonth;
          });
          
          const expiringSoon = certificates.filter(cert => {
            if (!cert.expiration_date) return false;
            const expiryDate = new Date(cert.expiration_date);
            return expiryDate > now && expiryDate <= thirtyDaysFromNow;
          });
          
          const expired = certificates.filter(cert => cert.status === 'expired');
          
          setCertificateStats({
            total: certificates.length,
            issuedThisMonth: issuedThisMonth.length,
            expiringSoon: expiringSoon.length,
            expired: expired.length
          });
        }
        
        // Get quality metrics summary
        const metricsResponse = await labService.getQualityMetrics();
        if (!metricsResponse.error && metricsResponse.data) {
          const metrics = metricsResponse.data;
          
          const withinThreshold = metrics.filter(m => m.status === 'within-threshold');
          const belowThreshold = metrics.filter(m => m.status === 'below-threshold');
          const aboveThreshold = metrics.filter(m => m.status === 'above-threshold');
          
          setQualityMetricsSummary({
            total: metrics.length,
            withinThreshold: withinThreshold.length,
            belowThreshold: belowThreshold.length,
            aboveThreshold: aboveThreshold.length
          });
        }
        
        // Get recent activity (mock data for now)
        setRecentActivity([
          {
            type: 'equipment',
            name: 'Fluke 87V Multimeter',
            date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            action: 'Calibration performed'
          },
          {
            type: 'certificate',
            name: 'CAL-20250415-4872',
            date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
            action: 'Certificate issued'
          },
          {
            type: 'procedure',
            name: 'Transformer Testing Protocol',
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            action: 'Procedure updated'
          },
          {
            type: 'metric',
            name: 'Measurement Accuracy',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            action: 'Metric recorded'
          }
        ]);
        
        setError(null);
      } catch (err) {
        console.error("Exception in lab dashboard:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const navigateTo = (path: string) => {
    navigate(path);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Lab Portal Dashboard</h2>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-10">
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigateTo('/lab/equipment')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Microscope className="h-5 w-5 mr-2 text-blue-600" />
                  Equipment Calibration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Manage lab equipment and calibration records
                </p>
                <Button className="mt-4 w-full" size="sm">
                  Go to Equipment
                </Button>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigateTo('/lab/procedures')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Clipboard className="h-5 w-5 mr-2 text-green-600" />
                  Testing Procedures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  View and manage testing procedure documentation
                </p>
                <Button className="mt-4 w-full" size="sm">
                  Go to Procedures
                </Button>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigateTo('/lab/certificates')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Award className="h-5 w-5 mr-2 text-amber-600" />
                  Certificate Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Generate and deliver calibration certificates
                </p>
                <Button className="mt-4 w-full" size="sm">
                  Go to Certificates
                </Button>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigateTo('/lab/quality-metrics')}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2 text-purple-600" />
                  Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Track and analyze quality control metrics
                </p>
                <Button className="mt-4 w-full" size="sm">
                  Go to Metrics
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Status</CardTitle>
                <CardDescription>Overview of lab equipment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Equipment:</span>
                    <Badge variant="secondary">{equipmentStats.total}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                      Calibration Overdue:
                    </span>
                    <Badge variant="destructive">{equipmentStats.calibrationDue}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-amber-500" />
                      Calibration Due Soon:
                    </span>
                    <Badge variant="secondary">{equipmentStats.calibrationUpcoming}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Out of Service:</span>
                    <Badge variant="outline">{equipmentStats.outOfService}</Badge>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigateTo('/lab/equipment')}
                    >
                      View Equipment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Certificates</CardTitle>
                <CardDescription>Recent certificate activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Certificates:</span>
                    <Badge variant="secondary">{certificateStats.total}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Issued this Month:</span>
                    <Badge variant="default">{certificateStats.issuedThisMonth}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-amber-500" />
                      Expiring Soon:
                    </span>
                    <Badge variant="secondary">{certificateStats.expiringSoon}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Expired:</span>
                    <Badge variant="destructive">{certificateStats.expired}</Badge>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigateTo('/lab/certificates')}
                    >
                      View Certificates
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Quality Metrics and Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
                <CardDescription>Quality control status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Metrics:</span>
                    <Badge variant="secondary">{qualityMetricsSummary.total}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-green-600">
                      Within Threshold:
                    </span>
                    <Badge variant="default">{qualityMetricsSummary.withinThreshold}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-amber-600">
                      Below Threshold:
                    </span>
                    <Badge variant="secondary">{qualityMetricsSummary.belowThreshold}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-red-600">
                      Above Threshold:
                    </span>
                    <Badge variant="destructive">{qualityMetricsSummary.aboveThreshold}</Badge>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigateTo('/lab/quality-metrics')}
                    >
                      View Quality Metrics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions in the lab portal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                      {activity.type === 'equipment' && <Microscope className="h-5 w-5 text-blue-600" />}
                      {activity.type === 'certificate' && <Award className="h-5 w-5 text-amber-600" />}
                      {activity.type === 'procedure' && <FileText className="h-5 w-5 text-green-600" />}
                      {activity.type === 'metric' && <Activity className="h-5 w-5 text-purple-600" />}
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-500">{activity.name}</p>
                        <p className="text-xs text-gray-400">{formatDate(activity.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
} 