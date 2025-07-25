import React, { useState } from 'react';
import { Link, Route } from 'react-router-dom';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import Card, { CardContent } from '@/components/ui/Card';
import { EncryptionSettings } from './EncryptionSettings';

// This component shows the Admin Dashboard with various management cards
const AdminDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management Card (existing) */}
        {/* System Configuration Card (existing) */}
        {/* Other existing cards */}
        
        {/* Data Encryption Card */}
        <Link to="/admin/encryption" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-4 p-2 bg-purple-50 rounded-full">
                    <ShieldCheck className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Data Encryption</h3>
                    <p className="text-sm text-gray-500">Manage encryption for sensitive data</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Routes definition would go in the App.tsx or routing configuration, not here */}
      {/* Include this in your main routing file:
      <Route path="/admin/encryption" element={<EncryptionSettings />} />
      */}
    </div>
  );
};

export default AdminDashboard; 