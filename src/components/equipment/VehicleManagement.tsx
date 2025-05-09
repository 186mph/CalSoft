import React from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';

interface VehicleManagementProps {
  division?: string;
  portal?: string;
}

export default function VehicleManagement({ division, portal }: VehicleManagementProps) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Vehicle Management</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This module is under development. Soon, you'll be able to manage vehicles, track maintenance, and assign vehicles to technicians.
            </p>
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-blue-800">Coming Soon</h3>
                  <p className="mt-1 text-blue-600">
                    Vehicle management features will include:
                  </p>
                  <ul className="mt-2 list-disc list-inside text-blue-600">
                    <li>Vehicle registration and details management</li>
                    <li>Maintenance scheduling and history</li>
                    <li>Technician assignment and vehicle check-out</li>
                    <li>Fuel consumption and mileage tracking</li>
                    <li>Service reminders and alerts</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 