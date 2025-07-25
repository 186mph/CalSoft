import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useDivision } from '@/App';
import { EquipmentTracking, EquipmentTrackingRefHandle } from '@/components/equipment/EquipmentTracking';
import { VehicleTracking } from '@/components/equipment/VehicleTracking';
import { Layout } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Plus, Truck, Wrench } from 'lucide-react';
import { PageLayout } from '@/components/ui/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

export default function EquipmentPage() {
  const params = useParams();
  const { user } = useAuth();
  const { division, setDivision } = useDivision();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('equipment');
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  
  // Ref for the equipment tracking component
  const equipmentTrackingRef = useRef<EquipmentTrackingRefHandle>(null);

  useEffect(() => {
    if (params.division && params.division !== division) {
      setDivision(params.division as string);
    }
  }, [params.division, division, setDivision]);

  // Check user permissions
  const canAccessEquipment = user?.user_metadata?.role === 'Admin' || 
                            user?.user_metadata?.permissions?.includes('equipment_manage') || 
                            user?.user_metadata?.permissions?.includes('equipment_view');

  useEffect(() => {
    if (!user || !canAccessEquipment) {
      console.warn('User not logged in or does not have permission to access equipment.');
      navigate('/portal');
    }
  }, [user, canAccessEquipment, navigate]);

  // Handle adding a new vehicle
  const handleAddVehicle = () => {
    setShowVehicleForm(true);
    // Switch to the vehicles tab if not already active
    if (activeTab !== 'vehicles') {
      setActiveTab('vehicles');
    }
  };
  
  // Handle adding new equipment
  const handleAddEquipment = () => {
    setShowEquipmentForm(true);
    // Switch to the equipment tab if not already active
    if (activeTab !== 'equipment') {
      setActiveTab('equipment');
    }
  };

  // Reset the form state when tab changes
  useEffect(() => {
    if (activeTab !== 'vehicles') {
      setShowVehicleForm(false);
    }
    if (activeTab !== 'equipment') {
      setShowEquipmentForm(false);
    }
  }, [activeTab]);

  // Add a handler for the onClose event
  const handleVehicleFormClose = () => {
    setShowVehicleForm(false);
  };
  
  // Add a handler for the equipment form close event
  const handleEquipmentFormClose = () => {
    setShowEquipmentForm(false);
  };

  if (!division || !user || !canAccessEquipment) {
    return <div>Loading or checking access...</div>;
  }

  const formattedDivision = division
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <PageLayout
      title={`${formattedDivision} Division - Equipment Management`}
      subtitle="Manage equipment inventory, vehicles, assignments, and maintenance schedules"
      actions={null}
    >
      <Tabs 
        defaultValue="equipment" 
        className="w-full" 
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="equipment">
              <Wrench className="mr-2 h-4 w-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="vehicles">
              <Truck className="mr-2 h-4 w-4" />
              Vehicles
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'equipment' && (
            <Button onClick={handleAddEquipment}>
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          )}
          
          {activeTab === 'vehicles' && (
            <Button onClick={handleAddVehicle}>
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          )}
        </div>
        
        <TabsContent value="equipment" className="space-y-4">
          <EquipmentTracking 
            ref={equipmentTrackingRef} 
            division={division} 
            initialFormOpen={showEquipmentForm}
            onClose={handleEquipmentFormClose}
          />
        </TabsContent>
        
        <TabsContent value="vehicles" className="space-y-4">
          <VehicleTracking 
            division={division} 
            initialFormOpen={showVehicleForm}
            onClose={handleVehicleFormClose}
            hideAddButton={true}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
} 