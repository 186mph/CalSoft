import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { ClipboardList, Search, Clock } from 'lucide-react';

interface ScavengerMetricsProps {
  division: string;
}

export function ScavengerMetrics({ division }: ScavengerMetricsProps) {
  // Sample data for the metrics
  const [equipmentRequests, setEquipmentRequests] = useState(83);
  const [equipmentFound, setEquipmentFound] = useState(69);
  const [avgCompletionTime, setAvgCompletionTime] = useState(4.2);
  
  // Sample data for timeline analysis
  const timelineData = [
    { month: 'Jan', requests: 62, found: 52, avgTime: 4.8 },
    { month: 'Feb', requests: 58, found: 48, avgTime: 4.5 },
    { month: 'Mar', requests: 71, found: 59, avgTime: 4.3 },
    { month: 'Apr', requests: 69, found: 58, avgTime: 4.2 },
    { month: 'May', requests: 85, found: 72, avgTime: 4.0 },
    { month: 'Jun', requests: 79, found: 67, avgTime: 3.8 }
  ];
  
  // Sample data for success rate by equipment type
  const equipmentTypeData = [
    { type: 'Electrical', success: 92 },
    { type: 'Mechanical', success: 78 },
    { type: 'Industrial', success: 85 },
    { type: 'Specialized', success: 65 },
    { type: 'Obsolete', success: 45 }
  ];

  // Could be enhanced to fetch real data from Supabase
  useEffect(() => {
    // Placeholder for API calls to fetch real data
    // fetchScavengerMetrics(division).then(data => {
    //   setEquipmentRequests(data.equipmentRequests);
    //   setEquipmentFound(data.equipmentFound);
    //   setAvgCompletionTime(data.avgCompletionTime);
    // });
  }, [division]);

  // Calculate success rate
  const successRate = Math.round((equipmentFound / equipmentRequests) * 100);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Scavenger Performance</h2>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Equipment Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{equipmentRequests}</p>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <ClipboardList className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Equipment Found</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{equipmentFound} <span className="text-sm font-normal text-gray-500">({successRate}%)</span></p>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <Search className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Avg. Completion Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgCompletionTime} <span className="text-sm font-normal text-gray-500">days</span></p>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <Clock className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Analysis Charts */}
      <Card className="p-6">
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">Request Timeline</TabsTrigger>
            <TabsTrigger value="equipment">Equipment Types</TabsTrigger>
            <TabsTrigger value="timetrend">Completion Time Trend</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="pt-4">
            <p className="text-sm text-gray-500 mb-4">Monthly equipment requests and fulfillment</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timelineData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="requests" name="Requests" fill="#f26722" />
                  <Bar dataKey="found" name="Found" fill="#8D5F3D" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="equipment" className="pt-4">
            <p className="text-sm text-gray-500 mb-4">Success rate by equipment type</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={equipmentTypeData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="type" width={100} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="success" name="Success Rate %" fill="#f26722" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="timetrend" className="pt-4">
            <p className="text-sm text-gray-500 mb-4">Average order completion time trend</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f26722" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f26722" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" />
                  <YAxis domain={[3, 5]} />
                  <Tooltip formatter={(value) => `${value} days`} />
                  <Legend />
                  <Area type="monotone" dataKey="avgTime" name="Avg. Completion Time" stroke="#f26722" fillOpacity={1} fill="url(#colorTime)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

export default ScavengerMetrics; 