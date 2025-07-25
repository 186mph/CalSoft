import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { MetricsChart, MetricData } from '../ui/MetricsChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { 
  fetchNETADivisionMetrics,
  fetchReportApprovalMetrics,
  fetchVehicleAvailabilityMetrics,
  fetchEquipmentAvailabilityMetrics,
  fetchTechnicianCountMetrics
} from '../../services/metricsService';
import { Truck, Wrench, Users, FileCheck, PieChart } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

interface NETAMetricsProps {
  division?: string | null;
}

// Function to format division names for display
function formatDivisionForDisplay(division: string | null | undefined): string {
  if (!division) return 'all NETA divisions';
  
  // Replace underscores with spaces and capitalize each word
  const formatted = division
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return `the ${formatted} division`;
}

export function NETAMetrics({ division }: NETAMetricsProps) {
  const [loading, setLoading] = useState(true);
  const [divisionData, setDivisionData] = useState<any[]>([]);
  const [reportApprovalData, setReportApprovalData] = useState<MetricData[]>([]);
  const [vehiclesAvailable, setVehiclesAvailable] = useState<number>(0);
  const [equipmentAvailable, setEquipmentAvailable] = useState<number>(0);
  const [technicianCount, setTechnicianCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch metrics data for all divisions
        const divisionsMetrics = await fetchNETADivisionMetrics();
        setDivisionData(divisionsMetrics);

        // Fetch report approval data
        const reportApproval = await fetchReportApprovalMetrics();
        setReportApprovalData([
          { name: 'Approved', value: reportApproval.approved },
          { name: 'Pending', value: reportApproval.pending },
          { name: 'Rejected', value: reportApproval.rejected }
        ]);

        // Fetch single metrics
        const vehicles = await fetchVehicleAvailabilityMetrics(division || undefined);
        setVehiclesAvailable(vehicles);

        const equipment = await fetchEquipmentAvailabilityMetrics(division || undefined);
        setEquipmentAvailable(equipment);

        const technicians = await fetchTechnicianCountMetrics(division || undefined);
        setTechnicianCount(technicians);
      } catch (error) {
        console.error('Error loading NETA metrics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [division]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-xl">Performance Metrics</CardTitle>
        <CardDescription>
          Key metrics for {formatDivisionForDisplay(division)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="divisions">Division Comparison</TabsTrigger>
            <TabsTrigger value="reports">Report Approval</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              {/* Vehicles Available */}
              <Card>
                <div className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Vehicles Available</p>
                    {loading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{vehiclesAvailable}</p>
                    )}
                  </div>
                  <div className="rounded-md bg-black/5 p-2">
                    <Truck className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
                  </div>
                </div>
              </Card>

              {/* Equipment Available */}
              <Card>
                <div className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Equipment Available</p>
                    {loading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{equipmentAvailable}</p>
                    )}
                  </div>
                  <div className="rounded-md bg-black/5 p-2">
                    <Wrench className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
                  </div>
                </div>
              </Card>

              {/* Field Technicians */}
              <Card>
                <div className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Field Technicians</p>
                    {loading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{technicianCount}</p>
                    )}
                  </div>
                  <div className="rounded-md bg-black/5 p-2">
                    <Users className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Report Approval */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Report Approval Rate</CardTitle>
                  <div className="rounded-md bg-black/5 p-2">
                    <FileCheck className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : (
                  <div className="h-[200px]">
                    <MetricsChart 
                      type="pie"
                      data={reportApprovalData}
                      title="Report Status"
                      colors={['#4ade80', '#facc15', '#f87171']}
                      height={200}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="divisions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Division Resources Comparison</CardTitle>
                  <div className="rounded-md bg-black/5 p-2">
                    <PieChart className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Skeleton className="h-[300px] w-full" />
                  </div>
                ) : (
                  <div className="h-[350px]">
                    <MetricsChart 
                      type="divisions"
                      data={divisionData}
                      title="Division Comparison"
                      height={350}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Report Approval Status</CardTitle>
                  <div className="rounded-md bg-black/5 p-2">
                    <FileCheck className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Skeleton className="h-[300px] w-full" />
                  </div>
                ) : (
                  <div className="h-[350px]">
                    <MetricsChart 
                      type="bar"
                      data={reportApprovalData}
                      title="Report Status"
                      colors={['#4ade80', '#facc15', '#f87171']}
                      height={350}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 