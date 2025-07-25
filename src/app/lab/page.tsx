import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { EquipmentCalibration } from '@/components/lab/EquipmentCalibration';
import { TestingProcedures } from '@/components/lab/TestingProcedures';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Activity,
  FileText,
  Award,
  BarChart3,
  Microscope,
  Wrench
} from 'lucide-react';

// Placeholder components for future implementation
const CertificateGeneration = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <Award className="mr-2 h-5 w-5" />
        Certificate Generation & Delivery
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          Certificate generation and delivery functionality will be implemented in the next phase.
        </p>
      </div>
    </CardContent>
  </Card>
);

const QualityMetrics = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <BarChart3 className="mr-2 h-5 w-5" />
        Quality Control Metrics
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          Quality control metrics and reporting functionality will be implemented in the next phase.
        </p>
      </div>
    </CardContent>
  </Card>
);

export default function LabPortalPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold flex items-center">
          <Microscope className="mr-3 h-8 w-8" />
          Lab Portal
        </h1>
        <p className="text-muted-foreground">
          Manage lab equipment, calibration, procedures, certificates, and quality metrics
        </p>
      </div>
      
      <Tabs defaultValue="calibration" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-3xl">
          <TabsTrigger value="calibration" className="flex items-center justify-center">
            <Wrench className="mr-2 h-4 w-4" />
            Equipment Calibration
          </TabsTrigger>
          <TabsTrigger value="procedures" className="flex items-center justify-center">
            <FileText className="mr-2 h-4 w-4" />
            Test Procedures
          </TabsTrigger>
          <TabsTrigger value="certificates" className="flex items-center justify-center">
            <Award className="mr-2 h-4 w-4" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center justify-center">
            <Activity className="mr-2 h-4 w-4" />
            Quality Metrics
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="calibration">
            <EquipmentCalibration />
          </TabsContent>
          
          <TabsContent value="procedures">
            <TestingProcedures />
          </TabsContent>
          
          <TabsContent value="certificates">
            <CertificateGeneration />
          </TabsContent>
          
          <TabsContent value="metrics">
            <QualityMetrics />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
} 