import React, { useState } from 'react';
import { format } from 'date-fns';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem,
  SelectRoot
} from '@/components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Search, Plus, Tag, Calendar, User, DollarSign, MapPin, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';

// Define asset types
interface Asset {
  id: string;
  name: string;
  type: string;
  purchaseDate: string;
  cost: number;
  location: string;
  assignedTo?: string;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  serialNumber?: string;
  warrantyExpiration?: string;
  lastMaintenance?: string;
  notes?: string;
  checkoutHistory?: CheckoutRecord[];
}

interface CheckoutRecord {
  id: string;
  assetId: string;
  checkoutDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  checkedOutBy: string;
  checkedOutTo: string;
  notes?: string;
}

interface AssetFormData {
  name: string;
  type: string;
  purchaseDate: string;
  cost: number;
  location: string;
  serialNumber: string;
  warrantyExpiration: string;
  notes: string;
}

interface CheckoutFormData {
  expectedReturnDate: string;
  checkedOutBy: string;
  checkedOutTo: string;
  notes: string;
}

// Sample data - replace with API calls
const sampleAssets: Asset[] = [
  {
    id: '1',
    name: 'Dell Latitude 5520',
    type: 'laptop',
    purchaseDate: '2023-03-15',
    cost: 1200,
    location: 'IT Department',
    status: 'assigned',
    assignedTo: 'John Doe',
    serialNumber: 'DL55207890',
    warrantyExpiration: '2026-03-15',
    lastMaintenance: '2023-12-10',
    notes: 'Company standard laptop configuration',
    checkoutHistory: [
      {
        id: 'c1',
        assetId: '1',
        checkoutDate: '2023-04-01',
        expectedReturnDate: '2024-04-01',
        checkedOutBy: 'IT Admin',
        checkedOutTo: 'John Doe',
        notes: 'Annual laptop assignment'
      }
    ]
  },
  {
    id: '2',
    name: 'HP Color LaserJet Pro',
    type: 'printer',
    purchaseDate: '2022-11-05',
    cost: 499.99,
    location: 'Marketing Department',
    status: 'available',
    serialNumber: 'HPL8700123',
    warrantyExpiration: '2025-11-05',
    lastMaintenance: '2023-11-10',
  },
  {
    id: '3',
    name: 'Logitech ConferenceCam',
    type: 'conferencing',
    purchaseDate: '2023-01-20',
    cost: 899.99,
    location: 'Conference Room A',
    status: 'maintenance',
    serialNumber: 'LGT456789',
    warrantyExpiration: '2025-01-20',
    lastMaintenance: '2023-10-15',
    notes: 'Scheduled for firmware update',
  },
  {
    id: '4',
    name: 'Steelcase Gesture Chair',
    type: 'furniture',
    purchaseDate: '2022-08-12',
    cost: 1150,
    location: 'Executive Office',
    status: 'assigned',
    assignedTo: 'Jane Smith',
    serialNumber: 'SC78901234',
    warrantyExpiration: '2027-08-12',
  },
  {
    id: '5',
    name: 'Portable Projector',
    type: 'presentation',
    purchaseDate: '2023-02-28',
    cost: 750,
    location: 'Equipment Room',
    status: 'available',
    serialNumber: 'PP9876543',
    warrantyExpiration: '2025-02-28',
    lastMaintenance: '2023-08-15',
  }
];

// Asset type options
const assetTypes = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'desktop', label: 'Desktop Computer' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'phone', label: 'Phone' },
  { value: 'printer', label: 'Printer' },
  { value: 'scanner', label: 'Scanner' },
  { value: 'networking', label: 'Networking Equipment' },
  { value: 'conferencing', label: 'Conferencing Equipment' },
  { value: 'presentation', label: 'Presentation Equipment' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'low_voltage_switch_multi_device_test', label: '6-Low Voltage Switch - Multi-Device TEST' },
  { value: 'other', label: 'Other' }
];

// Status colors for badges
const statusColors = {
  available: 'default',
  assigned: 'secondary',
  maintenance: 'destructive',
  retired: 'outline'
} as const;

export default function AssetTracking() {
  const [assets, setAssets] = useState<Asset[]>(sampleAssets);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Form states
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [assetForm, setAssetForm] = useState<AssetFormData>({
    name: '',
    type: 'laptop',
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    cost: 0,
    location: '',
    serialNumber: '',
    warrantyExpiration: '',
    notes: ''
  });
  
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormData>({
    expectedReturnDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    checkedOutBy: 'Current User', // Replace with actual user
    checkedOutTo: '',
    notes: ''
  });

  // Filter assets based on search term, type, and status
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || asset.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'assigned' && asset.status === 'assigned') ||
      (activeTab === 'available' && asset.status === 'available') ||
      (activeTab === 'maintenance' && asset.status === 'maintenance');
    
    return matchesSearch && matchesType && matchesStatus && matchesTab;
  });

  // Handle adding a new asset
  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate form
      if (!assetForm.name.trim() || !assetForm.location.trim()) {
        throw new Error('Please fill in all required fields');
      }
      
      // Create new asset
      const newAsset: Asset = {
        id: Math.random().toString(36).substr(2, 9),
        ...assetForm,
        status: 'available',
        cost: Number(assetForm.cost)
      };
      
      setAssets(prev => [...prev, newAsset]);
      setShowAssetForm(false);
      setAssetForm({
        name: '',
        type: 'laptop',
        purchaseDate: format(new Date(), 'yyyy-MM-dd'),
        cost: 0,
        location: '',
        serialNumber: '',
        warrantyExpiration: '',
        notes: ''
      });
      setFormError(null);
    } catch (error) {
      console.error('Error creating asset:', error);
      setFormError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle asset checkout
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!selectedAsset) {
        throw new Error('No asset selected');
      }
      
      if (!checkoutForm.checkedOutTo.trim()) {
        throw new Error('Please specify who the asset is assigned to');
      }
      
      // Create checkout record
      const checkoutRecord: CheckoutRecord = {
        id: Math.random().toString(36).substr(2, 9),
        assetId: selectedAsset.id,
        checkoutDate: format(new Date(), 'yyyy-MM-dd'),
        expectedReturnDate: checkoutForm.expectedReturnDate,
        checkedOutBy: checkoutForm.checkedOutBy,
        checkedOutTo: checkoutForm.checkedOutTo,
        notes: checkoutForm.notes
      };
      
      // Update the asset
      const updatedAssets = assets.map(asset => {
        if (asset.id === selectedAsset.id) {
          return {
            ...asset,
            status: 'assigned' as const,
            assignedTo: checkoutForm.checkedOutTo,
            checkoutHistory: [
              ...(asset.checkoutHistory || []),
              checkoutRecord
            ]
          };
        }
        return asset;
      });
      
      setAssets(updatedAssets);
      setShowCheckoutForm(false);
      setSelectedAsset(null);
      setCheckoutForm({
        expectedReturnDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        checkedOutBy: 'Current User',
        checkedOutTo: '',
        notes: ''
      });
      setFormError(null);
    } catch (error) {
      console.error('Error checking out asset:', error);
      setFormError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle asset return (check-in)
  const handleAssetReturn = (assetId: string) => {
    const updatedAssets = assets.map(asset => {
      if (asset.id === assetId) {
        // Update the most recent checkout record with a return date
        const updatedHistory = asset.checkoutHistory ? [...asset.checkoutHistory] : [];
        if (updatedHistory.length > 0) {
          const lastIndex = updatedHistory.length - 1;
          updatedHistory[lastIndex] = {
            ...updatedHistory[lastIndex],
            actualReturnDate: format(new Date(), 'yyyy-MM-dd')
          };
        }
        
        return {
          ...asset,
          status: 'available' as const,
          assignedTo: undefined,
          checkoutHistory: updatedHistory
        };
      }
      return asset;
    });
    
    setAssets(updatedAssets);
  };

  // Handle asset maintenance status
  const handleMaintenanceStatus = (assetId: string, inMaintenance: boolean) => {
    const updatedAssets = assets.map(asset => {
      if (asset.id === assetId) {
        return {
          ...asset,
          status: inMaintenance ? 'maintenance' as const : 'available' as const,
          lastMaintenance: inMaintenance ? format(new Date(), 'yyyy-MM-dd') : asset.lastMaintenance
        };
      }
      return asset;
    });
    
    setAssets(updatedAssets);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Asset Tracking</h2>
        <Button onClick={() => setShowAssetForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Asset
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="all">All Assets</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
              <TabsTrigger value="assigned">Assigned</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>
            
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    className="pl-9"
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="md:w-48">
                  <SelectRoot 
                    value={typeFilter} 
                    onValueChange={setTypeFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {assetTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </div>
                <div className="md:w-48">
                  <SelectRoot 
                    value={statusFilter} 
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </SelectRoot>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        No assets found matching the criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-xs text-gray-500">SN: {asset.serialNumber}</div>
                        </TableCell>
                        <TableCell>{assetTypes.find(t => t.value === asset.type)?.label || asset.type}</TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>
                          <Badge variant={statusColors[asset.status]}>
                            {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{asset.assignedTo || '—'}</TableCell>
                        <TableCell>{format(new Date(asset.purchaseDate), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {asset.status === 'available' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setShowCheckoutForm(true);
                                }}
                              >
                                Checkout
                              </Button>
                            )}
                            {asset.status === 'assigned' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleAssetReturn(asset.id)}
                              >
                                Return
                              </Button>
                            )}
                            {asset.status !== 'maintenance' && asset.status !== 'retired' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleMaintenanceStatus(asset.id, true)}
                              >
                                Maintenance
                              </Button>
                            )}
                            {asset.status === 'maintenance' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleMaintenanceStatus(asset.id, false)}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Asset Form Dialog */}
      <Dialog open={showAssetForm} onOpenChange={setShowAssetForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>
              Enter the details of the new asset to add to inventory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssetSubmit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Name *</label>
              <Input
                value={assetForm.name}
                onChange={(e) => setAssetForm({...assetForm, name: e.target.value})}
                placeholder="Dell Latitude 5520"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Type *</label>
              <SelectRoot 
                value={assetForm.type} 
                onValueChange={(value: string) => setAssetForm({...assetForm, type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Purchase Date *</label>
                <Input
                  type="date"
                  value={assetForm.purchaseDate}
                  onChange={(e) => setAssetForm({...assetForm, purchaseDate: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={assetForm.cost}
                  onChange={(e) => setAssetForm({...assetForm, cost: parseFloat(e.target.value)})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location *</label>
              <Input
                value={assetForm.location}
                onChange={(e) => setAssetForm({...assetForm, location: e.target.value})}
                placeholder="IT Department"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Serial Number</label>
              <Input
                value={assetForm.serialNumber}
                onChange={(e) => setAssetForm({...assetForm, serialNumber: e.target.value})}
                placeholder="SN12345678"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Warranty Expiration</label>
              <Input
                type="date"
                value={assetForm.warrantyExpiration}
                onChange={(e) => setAssetForm({...assetForm, warrantyExpiration: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={assetForm.notes}
                onChange={(e) => setAssetForm({...assetForm, notes: e.target.value})}
                placeholder="Additional details about this asset"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssetForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Add Asset'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Checkout Form Dialog */}
      <Dialog open={showCheckoutForm} onOpenChange={setShowCheckoutForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout Asset</DialogTitle>
            <DialogDescription>
              {selectedAsset && (
                <span>Assign {selectedAsset.name} to a user</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCheckoutSubmit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {selectedAsset && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <h3 className="font-medium">{selectedAsset.name}</h3>
                <p className="text-sm text-gray-500">
                  Type: {assetTypes.find(t => t.value === selectedAsset.type)?.label}
                </p>
                <p className="text-sm text-gray-500">
                  SN: {selectedAsset.serialNumber}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Assign To *</label>
              <Input
                value={checkoutForm.checkedOutTo}
                onChange={(e) => setCheckoutForm({...checkoutForm, checkedOutTo: e.target.value})}
                placeholder="Employee name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Expected Return Date</label>
              <Input
                type="date"
                value={checkoutForm.expectedReturnDate}
                onChange={(e) => setCheckoutForm({...checkoutForm, expectedReturnDate: e.target.value})}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={checkoutForm.notes}
                onChange={(e) => setCheckoutForm({...checkoutForm, notes: e.target.value})}
                placeholder="Reason for checkout, condition, etc."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCheckoutForm(false);
                  setSelectedAsset(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Checking out...' : 'Checkout Asset'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 