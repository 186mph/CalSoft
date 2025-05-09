import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, AlertTriangle, ShoppingBag } from 'lucide-react';

interface ArmadilloMetricsProps {
  division: string;
}

export function ArmadilloMetrics({ division }: ArmadilloMetricsProps) {
  // Sample data for the metrics
  const [glovesSold, setGlovesSold] = useState(1245);
  const [glovesAvailable, setGlovesAvailable] = useState(872);
  const [failureRate, setFailureRate] = useState(2.8);
  
  // Sample data for failure analysis
  const failureData = [
    { name: 'Manufacturing', value: 65 },
    { name: 'Packaging', value: 20 },
    { name: 'Materials', value: 15 }
  ];
  
  // Sample monthly sales data
  const monthlySalesData = [
    { name: 'Jan', sold: 85 },
    { name: 'Feb', sold: 102 },
    { name: 'Mar', sold: 95 },
    { name: 'Apr', sold: 120 },
    { name: 'May', sold: 105 },
    { name: 'Jun', sold: 132 },
    { name: 'Jul', sold: 115 },
    { name: 'Aug', sold: 125 },
    { name: 'Sep', sold: 142 },
    { name: 'Oct', sold: 136 },
    { name: 'Nov', sold: 118 },
    { name: 'Dec', sold: 130 }
  ];

  // Could be enhanced to fetch real data from Supabase
  useEffect(() => {
    // Placeholder for API calls to fetch real data
    // fetchArmadilloMetrics(division).then(data => {
    //   setGlovesSold(data.glovesSold);
    //   setGlovesAvailable(data.glovesAvailable);
    //   setFailureRate(data.failureRate);
    // });
  }, [division]);

  // Colors for the pie chart
  const COLORS = ['#f26722', '#8D5F3D', '#FFBB28'];

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Armadillo Performance</h2>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Gloves Sold</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{glovesSold}</p>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <ShoppingBag className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Gloves Available</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{glovesAvailable}</p>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <Package className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Failure Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{failureRate}%</p>
            </div>
            <div className="rounded-md bg-black/5 p-2">
              <AlertTriangle className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Analysis Charts */}
      <Card className="p-6">
        <Tabs defaultValue="sales">
          <TabsList>
            <TabsTrigger value="sales">Monthly Sales</TabsTrigger>
            <TabsTrigger value="failures">Failure Analysis</TabsTrigger>
          </TabsList>
          <TabsContent value="sales" className="pt-4">
            <p className="text-sm text-gray-500 mb-4">Monthly glove sales analysis</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlySalesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sold" name="Gloves Sold" fill="#f26722" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          <TabsContent value="failures" className="pt-4">
            <p className="text-sm text-gray-500 mb-4">Breakdown of failure causes</p>
            <div className="h-80 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={failureData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {failureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} units`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

export default ArmadilloMetrics; 