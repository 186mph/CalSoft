import React, { useLayoutEffect, useEffect } from 'react';
import { 
  FileText, 
  PencilRuler, 
  Book, 
  FileSymlink, 
  ChevronRight, 
  Users,
  Building,
  Briefcase,
  FileCode, 
  Workflow,
  Gauge
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { PageLayout } from '@/components/ui/PageLayout';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/AuthContext';
import { useDivision } from '@/App';

export default function EngineeringDashboard() {
  const { user } = useAuth();
  const { setDivision } = useDivision();
  
  // Scroll to top when the component mounts
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Set division context to engineering when this component mounts
  useEffect(() => {
    setDivision('engineering');
  }, [setDivision]);

  return (
    <PageLayout
      title="Engineering Portal"
      subtitle="Design management, technical documentation, and standards compliance"
      actions={<Badge className="!bg-accent-color !text-white">Engineering</Badge>}
    >
      {/* Quick Actions Section */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
          <Link to="/engineering/designs" className="block p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-full mr-3">
                  <PencilRuler className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Design Approval</h3>
                  <p className="text-sm text-gray-600">Review and approve engineering designs</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Link>
        </Card>
        
        <Card className="hover:shadow-md hover:border-green-200 transition-all cursor-pointer">
          <Link to="/engineering/documentation" className="block p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-full mr-3">
                  <Book className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Technical Documentation</h3>
                  <p className="text-sm text-gray-600">Access engineering documents and manuals</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Link>
        </Card>
        
        <Card className="hover:shadow-md hover:border-accent-color/30 transition-all cursor-pointer">
          <Link to="/engineering/standards" className="block p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-accent-color/10 rounded-full mr-3">
                  <FileCode className="h-5 w-5 text-accent-color" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Standards & Compliance</h3>
                  <p className="text-sm text-gray-600">Access engineering standards and updates</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Link>
        </Card>
        
        <Card className="hover:shadow-md hover:border-purple-200 transition-all cursor-pointer">
          <Link to="/engineering/drawings" className="block p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 rounded-full mr-3">
                  <FileSymlink className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Drawing Repository</h3>
                  <p className="text-sm text-gray-600">Access technical drawings and blueprints</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Link>
        </Card>
        
        <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
          <Link to="/engineering/customers" className="block p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-full mr-3">
                  <Building className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Customers</h3>
                  <p className="text-sm text-gray-600">Manage engineering customers</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Link>
        </Card>
        
        <Card className="hover:shadow-md hover:border-green-200 transition-all cursor-pointer">
          <Link to="/engineering/jobs" className="block p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-full mr-3">
                  <Briefcase className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Jobs & Projects</h3>
                  <p className="text-sm text-gray-600">Manage engineering projects</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Link>
        </Card>
      </div>
      
      {/* Engineering Metrics Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Engineering Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Design Reviews</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">24</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">8 pending approval</p>
              </div>
              <div className="rounded-md bg-black/5 p-2">
                <PencilRuler className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">3 in critical phase</p>
              </div>
              <div className="rounded-md bg-black/5 p-2">
                <Workflow className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Standard Updates</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">7</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">2 require action</p>
              </div>
              <div className="rounded-md bg-black/5 p-2">
                <FileCode className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-white/70">Compliance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">98%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Above target (95%)</p>
              </div>
              <div className="rounded-md bg-black/5 p-2">
                <Gauge className="h-4 w-4 text-black dark:text-[#8D5F3D]" />
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Recent Activity Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <div className="p-6">
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="p-1.5 rounded-full bg-blue-50 text-blue-500 mr-3 mt-0.5">
                  <PencilRuler className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Main Line Power Distribution Design approved</p>
                  <p className="text-xs text-gray-500">Yesterday at 2:34 PM</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="p-1.5 rounded-full bg-green-50 text-green-500 mr-3 mt-0.5">
                  <Book className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Technical Documentation updated for Transformer Specifications</p>
                  <p className="text-xs text-gray-500">2 days ago</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="p-1.5 rounded-full bg-accent-color/10 text-accent-color mr-3 mt-0.5">
                  <FileCode className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-medium">IEEE 1547 Standard update notification</p>
                  <p className="text-xs text-gray-500">Last week</p>
                </div>
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
} 