import { FaEdit, FaUserCheck, FaCalendarAlt, FaBuilding, FaToolbox } from 'react-icons/fa';
import { Equipment } from '@/lib/interfaces/equipment';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface EquipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment;
  onEdit: () => void;
  onAssign: () => void;
}

export default function EquipmentDetailsModal({
  isOpen,
  onClose,
  equipment,
  onEdit,
  onAssign
}: EquipmentDetailsModalProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Equipment Details: ${equipment.name}`}>
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Equipment Name</h3>
              <p className="mt-1 text-sm text-gray-900">{equipment.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Type</h3>
              <p className="mt-1 text-sm text-gray-900">{equipment.type}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Serial Number</h3>
              <p className="mt-1 text-sm text-gray-900">{equipment.serial_number}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Model</h3>
              <p className="mt-1 text-sm text-gray-900">{equipment.model}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Manufacturer</h3>
              <p className="mt-1 text-sm text-gray-900">{equipment.manufacturer}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Location</h3>
              <p className="mt-1 text-sm text-gray-900">{equipment.location}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className="mt-1">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  equipment.status === 'available' ? 'bg-green-100 text-green-800' :
                  equipment.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                  equipment.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {equipment.status}
                </span>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Division</h3>
              <p className="mt-1 text-sm text-gray-900">{equipment.division || 'Not assigned'}</p>
            </div>
          </div>
        </div>

        {/* Customer and Asset Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Related Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-gray-500 flex items-center">
                <FaBuilding className="mr-1" /> Customer
              </h4>
              <p className="mt-1 text-sm text-gray-900">
                {equipment.customer ? 
                  `${equipment.customer.name || ''} ${equipment.customer.company_name ? `(${equipment.customer.company_name})` : ''}` : 
                  'No customer assigned'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 flex items-center">
                <FaToolbox className="mr-1" /> Asset
              </h4>
              <p className="mt-1 text-sm text-gray-900">
                {equipment.asset ? 
                  `${equipment.asset.name || ''} ${equipment.asset.type ? `(${equipment.asset.type})` : ''}` : 
                  'No asset assigned'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Dates</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-gray-500">Purchase Date</h4>
              <p className="mt-1 text-sm text-gray-900">{formatDate(equipment.purchase_date)}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500">Warranty Expiration</h4>
              <p className="mt-1 text-sm text-gray-900">{formatDate(equipment.warranty_expiration)}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500">Last Maintenance</h4>
              <p className="mt-1 text-sm text-gray-900">{formatDate(equipment.last_maintenance_date)}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500">Next Maintenance</h4>
              <p className="mt-1 text-sm text-gray-900">{formatDate(equipment.next_maintenance_date)}</p>
            </div>
          </div>
        </div>

        {equipment.notes && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
            <p className="text-sm text-gray-900 whitespace-pre-line">{equipment.notes}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-4">
          <Button
            variant="outline"
            leftIcon={<FaCalendarAlt />}
            onClick={() => {
              onClose();
              // Navigate to maintenance schedule - implement this functionality
            }}
          >
            View Maintenance History
          </Button>
          <Button
            variant="outline"
            leftIcon={<FaUserCheck />}
            onClick={onAssign}
            disabled={equipment.status !== 'available'}
          >
            Assign Equipment
          </Button>
          <Button
            variant="primary"
            leftIcon={<FaEdit />}
            onClick={onEdit}
          >
            Edit Equipment
          </Button>
        </div>
      </div>
    </Modal>
  );
} 