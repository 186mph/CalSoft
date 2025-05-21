import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import { equipmentService } from '@/lib/services/equipmentService';
import { equipmentMaintenanceService } from '@/lib/services/equipmentMaintenanceService';
import { Equipment, MaintenanceRecord } from '@/lib/interfaces/equipment';
import MaintenanceForm from './MaintenanceForm';
import { FaTools, FaClock, FaCalendarCheck, FaExclamationTriangle } from 'react-icons/fa';

interface MaintenanceScheduleProps {
  division?: string;
  portal?: string;
}

export default function MaintenanceSchedule({ division, portal }: MaintenanceScheduleProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<Equipment[]>([]);
  const [overdueMaintenance, setOverdueMaintenance] = useState<Equipment[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRecord | null>(null);
  const [daysAhead, setDaysAhead] = useState(30);
  
  // Fetch maintenance schedule
  useEffect(() => {
    async function fetchMaintenanceSchedule() {
      setIsLoading(true);
      try {
        const result = await equipmentMaintenanceService.getMaintenanceSchedule(daysAhead);
        if (result.upcoming.data) {
          setUpcomingMaintenance(result.upcoming.data as unknown as Equipment[]);
        }
        if (result.overdue.data) {
          setOverdueMaintenance(result.overdue.data as unknown as Equipment[]);
        }
      } catch (error) {
        console.error('Error fetching maintenance schedule:', error);
        toast({
          title: 'Error',
          description: 'Failed to load maintenance schedule',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMaintenanceSchedule();
  }, [daysAhead]);
  
  const handleRefresh = () => {
    setSelectedEquipment(null);
    setSelectedMaintenance(null);
    equipmentMaintenanceService.getMaintenanceSchedule(daysAhead).then(result => {
      if (result.upcoming.data) setUpcomingMaintenance(result.upcoming.data as unknown as Equipment[]);
      if (result.overdue.data) setOverdueMaintenance(result.overdue.data as unknown as Equipment[]);
    });
  };
  
  const handleOpenForm = (equipment: Equipment, maintenanceRecord?: MaintenanceRecord) => {
    setSelectedEquipment(equipment);
    setSelectedMaintenance(maintenanceRecord || null);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedEquipment(null);
    setSelectedMaintenance(null);
  };
  
  const handleSave = () => {
    handleCloseForm();
    handleRefresh();
    toast({
      title: 'Success',
      description: 'Maintenance schedule updated',
      variant: 'success',
    });
  };
  
  const getDaysUntilMaintenance = (date: string) => {
    const today = new Date();
    const maintenanceDate = new Date(date);
    const diffTime = maintenanceDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const getStatusClass = (days: number) => {
    if (days < 0) return 'bg-red-100 text-red-800';
    if (days < 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center">
                <FaTools className="mr-2 text-blue-500" />
                Equipment Maintenance Schedule
              </h2>
              <div className="flex items-center space-x-2">
                <Select
                  value={daysAhead.toString()}
                  onChange={(e) => setDaysAhead(Number(e.target.value))}
                  options={[
                    { value: '7', label: 'Next 7 days' },
                    { value: '30', label: 'Next 30 days' },
                    { value: '90', label: 'Next 90 days' },
                  ]}
                  className="w-40"
                />
                <Button 
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming">
              <TabsList className="flex border-b border-gray-200 mb-4">
                <TabsTrigger value="upcoming">
                  Upcoming ({upcomingMaintenance.length})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="ml-4">
                  Overdue ({overdueMaintenance.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="space-y-4">
                {isLoading ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-500">Loading maintenance schedule...</p>
                  </div>
                ) : upcomingMaintenance.length === 0 ? (
                  <div className="py-8 text-center">
                    <FaCalendarCheck className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-500">No upcoming maintenance scheduled</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Equipment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Maintenance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Next Due
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Days Left
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {upcomingMaintenance.map((equipment) => {
                          const daysLeft = equipment.next_maintenance_date 
                            ? getDaysUntilMaintenance(equipment.next_maintenance_date)
                            : 0;
                          
                          return (
                            <tr key={equipment.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{equipment.name}</div>
                                <div className="text-sm text-gray-500">{equipment.serial_number}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{equipment.type}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {equipment.last_maintenance_date 
                                    ? new Date(equipment.last_maintenance_date).toLocaleDateString() 
                                    : 'Never'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {equipment.next_maintenance_date
                                    ? new Date(equipment.next_maintenance_date).toLocaleDateString()
                                    : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(daysLeft)}`}>
                                  {daysLeft} days
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button
                                  onClick={() => handleOpenForm(equipment)}
                                  size="sm"
                                  variant="outline"
                                >
                                  Log Maintenance
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="overdue" className="space-y-4">
                {isLoading ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-500">Loading overdue maintenance...</p>
                  </div>
                ) : overdueMaintenance.length === 0 ? (
                  <div className="py-8 text-center">
                    <FaCalendarCheck className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-500">No overdue maintenance</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">
                            There are {overdueMaintenance.length} equipment items with overdue maintenance.
                            Please schedule maintenance as soon as possible.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Equipment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Maintenance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Days Overdue
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {overdueMaintenance.map((equipment) => {
                          const daysOverdue = equipment.next_maintenance_date 
                            ? Math.abs(getDaysUntilMaintenance(equipment.next_maintenance_date))
                            : 0;
                          
                          return (
                            <tr key={equipment.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{equipment.name}</div>
                                <div className="text-sm text-gray-500">{equipment.serial_number}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{equipment.type}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {equipment.last_maintenance_date 
                                    ? new Date(equipment.last_maintenance_date).toLocaleDateString() 
                                    : 'Never'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {equipment.next_maintenance_date
                                    ? new Date(equipment.next_maintenance_date).toLocaleDateString()
                                    : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  {daysOverdue} days
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button
                                  onClick={() => handleOpenForm(equipment)}
                                  size="sm"
                                >
                                  Log Maintenance
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {isFormOpen && selectedEquipment && (
        <Modal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={selectedMaintenance ? 'Edit Maintenance Record' : 'Create Maintenance Record'}
        >
          <MaintenanceForm
            equipmentId={selectedEquipment.id}
            equipmentDetails={selectedEquipment}
            maintenanceRecord={selectedMaintenance || undefined}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
        </Modal>
      )}
    </div>
  );
} 