import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Wrench, Users, Database } from 'lucide-react';
import { getDivisionAccentColor } from '../../lib/utils';

interface CalibrationMetricsProps {
  division: string;
}

export function CalibrationMetrics({ division }: CalibrationMetricsProps) {
  // Sample data for the metrics
  const [assetsThisYear, setAssetsThisYear] = useState(275);
  const [travelingTechs, setTravelingTechs] = useState(6);
  const [labTechs, setLabTechs] = useState(12);
  
  // Sample quarterly data for comparison
  const quarterlyData = [
    { name: 'Q1', assets: 62, certifications: 58, completion: 92 },
    { name: 'Q2', assets: 78, certifications: 74, completion: 89 },
    { name: 'Q3', assets: 65, certifications: 61, completion: 94 },
    { name: 'Q4', assets: 70, certifications: 68, completion: 91 }
  ];

  const accentColor = getDivisionAccentColor('calibration');

  // Could be enhanced to fetch real data from Supabase
  useEffect(() => {
    // Placeholder for API calls to fetch real data
    // fetchCalibrationMetrics(division).then(data => {
    //   setAssetsThisYear(data.assetsThisYear);
    //   setTravelingTechs(data.travelingTechs);
    //   setLabTechs(data.labTechs);
    // });
  }, [division]);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Calibration Performance</h2>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Assets This Year</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{assetsThisYear}</p>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <Database className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Traveling Techs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{travelingTechs}</p>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <Wrench className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Lab Techs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{labTechs}</p>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <Users className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quarterly Comparison Charts */}
      <Card className="p-6">
        <Tabs defaultValue="assets">
          <TabsList>
            <TabsTrigger value="assets">Assets Calibrated</TabsTrigger>
            <TabsTrigger value="certifications">Certifications Issued</TabsTrigger>
            <TabsTrigger value="completion">Completion Rate %</TabsTrigger>
          </TabsList>
          <TabsContent value="assets" className="pt-4">
            <p className="text-sm text-gray-500 mb-4">Quarterly comparison of assets calibrated</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={quarterlyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="assets" name="Assets Calibrated" fill={accentColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="certifications" className="pt-4">
            <p className="text-sm text-gray-500 mb-4">Quarterly comparison of certifications issued</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={quarterlyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="certifications" name="Certifications" fill="#8D5F3D" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="completion" className="pt-4">
            <p className="text-sm text-gray-500 mb-4">Quarterly comparison of completion rates</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={quarterlyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis domain={[85, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completion" name="Completion %" stroke={accentColor} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

export default CalibrationMetrics; 