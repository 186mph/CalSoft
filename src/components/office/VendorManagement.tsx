import React, { useState } from 'react';
import { Search, Plus, Filter, Download, Upload, Star, StarOff } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  SelectRoot as Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/toast';
import { Textarea } from '@/components/ui/Textarea';

// Define vendor interfaces
interface VendorContact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  primary: boolean;
}

interface VendorContract {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  value: number;
  status: 'active' | 'pending' | 'expired' | 'terminated' | 'renewal';
  renewalTerms: string;
  documentUrl?: string;
}

interface Vendor {
  id: string;
  companyName: string;
  category: string[];
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  phone: string;
  email: string;
  website: string;
  rating: number;
  active: boolean;
  notes: string;
  contacts: VendorContact[];
  contracts: VendorContract[];
}

interface VendorFormData {
  companyName: string;
  category: string[];
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  phone: string;
  email: string;
  website: string;
  rating: number;
  active: boolean;
  notes: string;
}

// Sample data for vendors
const sampleVendors: Vendor[] = [
  {
    id: '1',
    companyName: 'Tech Solutions Inc.',
    category: ['Technology', 'Software'],
    address: {
      street: '123 Tech Blvd',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'USA'
    },
    phone: '(415) 555-1234',
    email: 'info@techsolutions.com',
    website: 'www.techsolutions.com',
    rating: 4,
    active: true,
    notes: 'Primary software provider for our CRM system.',
    contacts: [
      {
        id: '1-1',
        name: 'John Smith',
        title: 'Account Manager',
        email: 'john.smith@techsolutions.com',
        phone: '(415) 555-1235',
        primary: true
      },
      {
        id: '1-2',
        name: 'Sarah Johnson',
        title: 'Technical Support Lead',
        email: 'sarah.j@techsolutions.com',
        phone: '(415) 555-1236',
        primary: false
      }
    ],
    contracts: [
      {
        id: '1-1',
        title: 'CRM Software License',
        description: 'Annual license for CRM software and support',
        startDate: '2023-06-15',
        endDate: '2024-06-14',
        value: 12500,
        status: 'active',
        renewalTerms: 'Auto-renewal with 30 day cancellation notice'
      },
      {
        id: '1-2',
        title: 'Technical Support Agreement',
        description: 'Premium technical support services',
        startDate: '2023-06-15',
        endDate: '2024-06-14',
        value: 5000,
        status: 'active',
        renewalTerms: 'Manual renewal required'
      }
    ]
  },
  {
    id: '2',
    companyName: 'Office Supplies Co.',
    category: ['Office Supplies', 'Furniture'],
    address: {
      street: '456 Supply Street',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
      country: 'USA'
    },
    phone: '(312) 555-6789',
    email: 'sales@officesupplies.co',
    website: 'www.officesupplies.co',
    rating: 5,
    active: true,
    notes: 'Reliable supplier for all office needs.',
    contacts: [
      {
        id: '2-1',
        name: 'Michael Brown',
        title: 'Sales Representative',
        email: 'm.brown@officesupplies.co',
        phone: '(312) 555-6790',
        primary: true
      }
    ],
    contracts: [
      {
        id: '2-1',
        title: 'Office Supplies Agreement',
        description: 'Monthly office supplies delivery contract',
        startDate: '2023-04-01',
        endDate: '2024-03-31',
        value: 9600,
        status: 'active',
        renewalTerms: 'Auto-renewal with 60 day notice for changes'
      }
    ]
  },
  {
    id: '3',
    companyName: 'Maintenance Masters',
    category: ['Maintenance', 'Facilities'],
    address: {
      street: '789 Service Road',
      city: 'Atlanta',
      state: 'GA',
      zip: '30301',
      country: 'USA'
    },
    phone: '(404) 555-4321',
    email: 'service@maintenancemasters.com',
    website: 'www.maintenancemasters.com',
    rating: 3,
    active: true,
    notes: 'Building maintenance service provider.',
    contacts: [
      {
        id: '3-1',
        name: 'Robert Taylor',
        title: 'Operations Manager',
        email: 'robert@maintenancemasters.com',
        phone: '(404) 555-4322',
        primary: true
      },
      {
        id: '3-2',
        name: 'Lisa Wilson',
        title: 'Scheduling Coordinator',
        email: 'lisa@maintenancemasters.com',
        phone: '(404) 555-4323',
        primary: false
      }
    ],
    contracts: [
      {
        id: '3-1',
        title: 'Building Maintenance Contract',
        description: 'Quarterly maintenance services for main office building',
        startDate: '2023-01-15',
        endDate: '2023-12-31',
        value: 15000,
        status: 'renewal',
        renewalTerms: 'Negotiation required 60 days before expiration'
      }
    ]
  },
  {
    id: '4',
    companyName: 'Global Catering LLC',
    category: ['Food Services', 'Events'],
    address: {
      street: '101 Culinary Avenue',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA'
    },
    phone: '(212) 555-8765',
    email: 'orders@globalcatering.com',
    website: 'www.globalcatering.com',
    rating: 4,
    active: true,
    notes: 'Our preferred catering company for company events.',
    contacts: [
      {
        id: '4-1',
        name: 'Amanda Chen',
        title: 'Events Coordinator',
        email: 'amanda@globalcatering.com',
        phone: '(212) 555-8766',
        primary: true
      }
    ],
    contracts: [
      {
        id: '4-1',
        title: 'Event Catering Services',
        description: 'On-demand catering for company events',
        startDate: '2023-03-01',
        endDate: '2024-02-29',
        value: 20000,
        status: 'active',
        renewalTerms: 'Annual review with option to extend'
      }
    ]
  },
  {
    id: '5',
    companyName: 'Reliable Transport',
    category: ['Transportation', 'Logistics'],
    address: {
      street: '246 Logistics Parkway',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      country: 'USA'
    },
    phone: '(469) 555-9876',
    email: 'dispatch@reliabletransport.com',
    website: 'www.reliabletransport.com',
    rating: 2,
    active: false,
    notes: 'Previously used for equipment delivery. Service quality has declined recently.',
    contacts: [
      {
        id: '5-1',
        name: 'David Martinez',
        title: 'Dispatch Manager',
        email: 'david@reliabletransport.com',
        phone: '(469) 555-9877',
        primary: true
      }
    ],
    contracts: [
      {
        id: '5-1',
        title: 'Equipment Transport Services',
        description: 'Transportation services for equipment delivery',
        startDate: '2022-07-01',
        endDate: '2023-06-30',
        value: 8000,
        status: 'expired',
        renewalTerms: 'No renewal terms - expired contract'
      }
    ]
  },
];

// Sample categories for dropdown
const vendorCategories = [
  'Technology',
  'Software',
  'Hardware',
  'Office Supplies',
  'Furniture',
  'Maintenance',
  'Facilities',
  'Food Services',
  'Events',
  'Transportation',
  'Logistics',
  'Consulting',
  'Legal',
  'Financial',
  'Telecommunications',
  'Marketing',
  'Printing',
  'Shipping',
  'Utilities',
  'Security',
  'Cleaning',
  'Healthcare',
  'Education',
  'Construction',
  'Other'
];

const VendorManagement: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>(sampleVendors);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [editContact, setEditContact] = useState<VendorContact | null>(null);
  const [editContract, setEditContract] = useState<VendorContract | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [contractsView, setContractsView] = useState<string>('active');
  
  const [vendorForm, setVendorForm] = useState<VendorFormData>({
    companyName: '',
    category: [],
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA'
    },
    phone: '',
    email: '',
    website: '',
    rating: 0,
    active: true,
    notes: ''
  });
  
  const [contactForm, setContactForm] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    primary: false
  });
  
  const [contractForm, setContractForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    value: 0,
    status: 'active' as const,
    renewalTerms: '',
    documentUrl: ''
  });

  // Filter vendors based on search term, category, rating, and status
  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = 
      vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contacts.some(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesCategory = categoryFilter === 'all' || vendor.category.includes(categoryFilter);
    const matchesRating = ratingFilter === 'all' || vendor.rating === parseInt(ratingFilter);
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && vendor.active) || 
      (statusFilter === 'inactive' && !vendor.active);
    
    return matchesSearch && matchesCategory && matchesRating && matchesStatus;
  });

  const filteredVendorsByTab = activeTab === 'all' 
    ? filteredVendors 
    : filteredVendors.filter(vendor => vendor.category.includes(activeTab));

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Calculate days until contract expiration
  const getDaysUntilExpiration = (endDate: string) => {
    const today = new Date();
    const expiryDate = new Date(endDate);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Get status badge color based on contract status
  const getContractStatusColor = (status: string, endDate: string) => {
    if (status === 'active') {
      const daysLeft = getDaysUntilExpiration(endDate);
      if (daysLeft < 0) return 'destructive';
      if (daysLeft < 30) return 'amber';
      return 'default';
    }
    if (status === 'renewal') return 'blue';
    if (status === 'expired') return 'destructive';
    if (status === 'terminated') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vendor Management</h2>
        <Button onClick={() => {
          setEditVendor(null);
          setShowVendorForm(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                className="pl-10"
                placeholder="Search vendors by name, email, or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {vendorCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  {[5, 4, 3, 2, 1].map(rating => (
                    <SelectItem key={rating} value={rating.toString()}>
                      {rating} Star{rating !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Vendors</TabsTrigger>
              {['Technology', 'Office Supplies', 'Maintenance', 'Food Services', 'Logistics'].map(category => (
                <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab}>
              <div className="grid grid-cols-1 gap-4">
                {filteredVendorsByTab.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No vendors found with the current filters.</p>
                  </div>
                ) : (
                  filteredVendorsByTab.map(vendor => (
                    <Card key={vendor.id} className={`overflow-hidden ${!vendor.active ? 'opacity-75' : ''}`}>
                      <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-1">
                          <div className="md:col-span-4 p-4 flex flex-col justify-between border-r">
                            <div>
                              <div className="flex justify-between">
                                <h3 className="text-lg font-bold">{vendor.companyName}</h3>
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} className="text-amber-400">
                                      {i < vendor.rating ? '★' : '☆'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {vendor.category.map((cat, index) => (
                                  <Badge key={index} variant="outline">{cat}</Badge>
                                ))}
                              </div>
                              <p className="mt-2 text-sm text-gray-600">
                                {vendor.address.city}, {vendor.address.state} • {vendor.phone}
                              </p>
                              {!vendor.active && (
                                <Badge variant="destructive" className="mt-2">Inactive</Badge>
                              )}
                            </div>
                            <div className="mt-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mr-2"
                                onClick={() => {
                                  setEditVendor(vendor);
                                  setShowVendorForm(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedVendor(vendor)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                          <div className="md:col-span-8 p-4">
                            <div className="flex justify-between mb-2">
                              <h4 className="font-semibold">Contacts</h4>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedVendor(vendor);
                                  setEditContact(null);
                                  setShowContactForm(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Add Contact
                              </Button>
                            </div>
                            {vendor.contacts.length === 0 ? (
                              <p className="text-gray-500 text-sm">No contacts added yet.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {vendor.contacts.map(contact => (
                                  <div key={contact.id} className="border rounded p-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="font-semibold">{contact.name}</span>
                                      {contact.primary && (
                                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                                      )}
                                    </div>
                                    <p className="text-gray-600">{contact.title}</p>
                                    <p>{contact.email}</p>
                                    <p>{contact.phone}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Vendor Form Dialog */}
      <Dialog open={showVendorForm} onOpenChange={setShowVendorForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            <DialogDescription>
              {editVendor 
                ? 'Update vendor information and details' 
                : 'Enter information about the new vendor'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Company Name*</label>
                <Input 
                  placeholder="Enter company name"
                  value={editVendor?.companyName || ""}
                  onChange={(e) => {
                    if (editVendor) {
                      setEditVendor({...editVendor, companyName: e.target.value});
                    }
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Categories*</label>
                <Select
                  value={editVendor?.category?.[0] || ""}
                  onValueChange={(value) => {
                    if (editVendor) {
                      // For simplicity, we're just handling the first category here
                      // In a real implementation, you'd want a multi-select
                      setEditVendor({...editVendor, category: [value]});
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary category" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Primary vendor category
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input 
                  placeholder="(123) 456-7890"
                  value={editVendor?.phone || ""}
                  onChange={(e) => {
                    if (editVendor) {
                      setEditVendor({...editVendor, phone: e.target.value});
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input 
                  placeholder="company@example.com"
                  type="email"
                  value={editVendor?.email || ""}
                  onChange={(e) => {
                    if (editVendor) {
                      setEditVendor({...editVendor, email: e.target.value});
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Website</label>
                <Input 
                  placeholder="www.example.com"
                  value={editVendor?.website || ""}
                  onChange={(e) => {
                    if (editVendor) {
                      setEditVendor({...editVendor, website: e.target.value});
                    }
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Rating</label>
                <Select
                  value={editVendor?.rating.toString() || "0"}
                  onValueChange={(value) => {
                    if (editVendor) {
                      setEditVendor({...editVendor, rating: parseInt(value)});
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1, 0].map(rating => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating > 0 ? `${rating} Star${rating !== 1 ? 's' : ''}` : 'Not Rated'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox" 
                  id="active-status"
                  checked={editVendor?.active || false}
                  onChange={(e) => {
                    if (editVendor) {
                      setEditVendor({...editVendor, active: e.target.checked});
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor="active-status" className="text-sm font-medium">Active Vendor</label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Street Address</label>
                <Input 
                  placeholder="Street address"
                  value={editVendor?.address?.street || ""}
                  onChange={(e) => {
                    if (editVendor) {
                      setEditVendor({
                        ...editVendor, 
                        address: {...editVendor.address, street: e.target.value}
                      });
                    }
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">City</label>
                  <Input 
                    placeholder="City"
                    value={editVendor?.address?.city || ""}
                    onChange={(e) => {
                      if (editVendor) {
                        setEditVendor({
                          ...editVendor, 
                          address: {...editVendor.address, city: e.target.value}
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">State</label>
                  <Input 
                    placeholder="State"
                    value={editVendor?.address?.state || ""}
                    onChange={(e) => {
                      if (editVendor) {
                        setEditVendor({
                          ...editVendor, 
                          address: {...editVendor.address, state: e.target.value}
                        });
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">ZIP Code</label>
                  <Input 
                    placeholder="ZIP"
                    value={editVendor?.address?.zip || ""}
                    onChange={(e) => {
                      if (editVendor) {
                        setEditVendor({
                          ...editVendor, 
                          address: {...editVendor.address, zip: e.target.value}
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Country</label>
                  <Input 
                    placeholder="Country"
                    value={editVendor?.address?.country || ""}
                    onChange={(e) => {
                      if (editVendor) {
                        setEditVendor({
                          ...editVendor, 
                          address: {...editVendor.address, country: e.target.value}
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea 
                  placeholder="Additional notes about this vendor"
                  rows={5}
                  value={editVendor?.notes || ""}
                  onChange={(e) => {
                    if (editVendor) {
                      setEditVendor({...editVendor, notes: e.target.value});
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditVendor(null);
                setShowVendorForm(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => {
              if (editVendor) {
                // Update existing vendor
                setVendors(vendors.map(v => v.id === editVendor.id ? editVendor : v));
                toast({
                  title: 'Vendor Updated',
                  description: `${editVendor.companyName} has been updated successfully.`,
                  variant: 'default',
                });
              } else {
                // Create new vendor
                const newVendor: Vendor = {
                  id: `vendor-${Date.now()}`,
                  companyName: "New Company", // In a real app, this would come from form data
                  category: ["Other"],
                  address: {
                    street: "",
                    city: "",
                    state: "",
                    zip: "",
                    country: "USA"
                  },
                  phone: "",
                  email: "",
                  website: "",
                  rating: 0,
                  active: true,
                  notes: "",
                  contacts: [],
                  contracts: []
                };
                setVendors([...vendors, newVendor]);
                toast({
                  title: 'Vendor Added',
                  description: `${newVendor.companyName} has been added successfully.`,
                  variant: 'default',
                });
              }
              setEditVendor(null);
              setShowVendorForm(false);
            }}>
              {editVendor ? 'Update Vendor' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editContact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
            <DialogDescription>
              {selectedVendor && (
                <span>
                  {editContact ? 'Update' : 'Add'} contact information for {selectedVendor.companyName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Contact Name*</label>
              <Input 
                placeholder="Full Name"
                value={editContact?.name || ""}
                onChange={(e) => {
                  if (editContact) {
                    setEditContact({...editContact, name: e.target.value});
                  }
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Title/Position</label>
              <Input 
                placeholder="e.g. Account Manager"
                value={editContact?.title || ""}
                onChange={(e) => {
                  if (editContact) {
                    setEditContact({...editContact, title: e.target.value});
                  }
                }}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Email*</label>
              <Input 
                placeholder="email@example.com"
                type="email"
                value={editContact?.email || ""}
                onChange={(e) => {
                  if (editContact) {
                    setEditContact({...editContact, email: e.target.value});
                  }
                }}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input 
                placeholder="(123) 456-7890"
                value={editContact?.phone || ""}
                onChange={(e) => {
                  if (editContact) {
                    setEditContact({...editContact, phone: e.target.value});
                  }
                }}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox" 
                id="primary-contact"
                checked={editContact?.primary || false}
                onChange={(e) => {
                  if (editContact) {
                    setEditContact({...editContact, primary: e.target.checked});
                  }
                }}
                className="rounded"
              />
              <label htmlFor="primary-contact" className="text-sm font-medium">Primary Contact</label>
            </div>
          </div>

          <DialogFooter>
            {editContact && (
              <Button
                variant="destructive"
                className="mr-auto"
                onClick={() => {
                  if (selectedVendor && editContact) {
                    // Remove the contact
                    const updatedContacts = selectedVendor.contacts.filter(c => c.id !== editContact.id);
                    const updatedVendor = {...selectedVendor, contacts: updatedContacts};
                    setVendors(vendors.map(v => v.id === selectedVendor.id ? updatedVendor : v));
                    setSelectedVendor(updatedVendor);
                    
                    toast({
                      title: 'Contact Removed',
                      description: `${editContact.name} has been removed from ${selectedVendor.companyName}.`,
                      variant: 'default',
                    });
                    
                    setEditContact(null);
                    setShowContactForm(false);
                  }
                }}
              >
                Remove
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setEditContact(null);
                setShowContactForm(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedVendor) {
                  if (editContact) {
                    // Update existing contact
                    const updatedContacts = selectedVendor.contacts.map(c => 
                      c.id === editContact.id ? editContact : c
                    );
                    
                    // If this contact is set as primary, make sure others are not
                    if (editContact.primary) {
                      updatedContacts.forEach(contact => {
                        if (contact.id !== editContact.id) {
                          contact.primary = false;
                        }
                      });
                    }
                    
                    const updatedVendor = {...selectedVendor, contacts: updatedContacts};
                    setVendors(vendors.map(v => v.id === selectedVendor.id ? updatedVendor : v));
                    setSelectedVendor(updatedVendor);
                    
                    toast({
                      title: 'Contact Updated',
                      description: `${editContact.name} has been updated.`,
                      variant: 'default',
                    });
                  } else {
                    // Create new contact
                    const newContact: VendorContact = {
                      id: `contact-${Date.now()}`,
                      name: "New Contact", // In a real app, this would come from form data
                      title: "",
                      email: "",
                      phone: "",
                      primary: selectedVendor.contacts.length === 0 // Make primary if it's the first contact
                    };
                    
                    // If this is the first contact or it's marked as primary, ensure others are not primary
                    const updatedContacts = [...selectedVendor.contacts];
                    if (newContact.primary) {
                      updatedContacts.forEach(contact => {
                        contact.primary = false;
                      });
                    }
                    
                    updatedContacts.push(newContact);
                    const updatedVendor = {...selectedVendor, contacts: updatedContacts};
                    setVendors(vendors.map(v => v.id === selectedVendor.id ? updatedVendor : v));
                    setSelectedVendor(updatedVendor);
                    
                    toast({
                      title: 'Contact Added',
                      description: `New contact has been added to ${selectedVendor.companyName}.`,
                      variant: 'default',
                    });
                  }
                  
                  setEditContact(null);
                  setShowContactForm(false);
                }
              }}
            >
              {editContact ? 'Update Contact' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Vendor Details Dialog */}
      <Dialog open={selectedVendor !== null && !showContactForm} onOpenChange={(open) => {
        if (!open) setSelectedVendor(null);
      }}>
        {selectedVendor && (
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedVendor.companyName}</span>
                <Badge variant={selectedVendor.active ? "default" : "destructive"}>
                  {selectedVendor.active ? "Active" : "Inactive"}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Vendor details and information
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  <div className="grid grid-cols-2 gap-y-2 mt-2">
                    <span className="text-sm font-medium text-gray-500">Categories:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedVendor.category.map((cat, index) => (
                        <Badge key={index} variant="outline">{cat}</Badge>
                      ))}
                    </div>
                    
                    <span className="text-sm font-medium text-gray-500">Rating:</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-amber-400">
                          {i < selectedVendor.rating ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                    
                    <span className="text-sm font-medium text-gray-500">Phone:</span>
                    <span>{selectedVendor.phone || 'N/A'}</span>
                    
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <span>{selectedVendor.email || 'N/A'}</span>
                    
                    <span className="text-sm font-medium text-gray-500">Website:</span>
                    <span>{selectedVendor.website || 'N/A'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold">Address</h3>
                  <div className="mt-2 space-y-1">
                    <p>{selectedVendor.address.street}</p>
                    <p>
                      {selectedVendor.address.city}, {selectedVendor.address.state} {selectedVendor.address.zip}
                    </p>
                    <p>{selectedVendor.address.country}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold">Notes</h3>
                  <p className="mt-2 text-sm">
                    {selectedVendor.notes || 'No additional notes.'}
                  </p>
                </div>
              </div>
              
              <div>
                <Tabs defaultValue="contacts" className="w-full">
                  <TabsList className="mb-4 w-full">
                    <TabsTrigger value="contacts" className="flex-1">Contacts</TabsTrigger>
                    <TabsTrigger value="contracts" className="flex-1">Contracts</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="contacts">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Contacts</h3>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditContact(null);
                          setShowContactForm(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Contact
                      </Button>
                    </div>
                    
                    {selectedVendor.contacts.length === 0 ? (
                      <div className="p-4 border rounded text-center text-gray-500">
                        <p>No contacts have been added for this vendor.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setEditContact(null);
                            setShowContactForm(true);
                          }}
                        >
                          Add First Contact
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedVendor.contacts.map(contact => (
                          <Card key={contact.id} className={contact.primary ? 'border-blue-300' : ''}>
                            <CardContent className="p-4">
                              <div className="flex justify-between">
                                <div>
                                  <h4 className="font-semibold flex items-center">
                                    {contact.name}
                                    {contact.primary && (
                                      <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>
                                    )}
                                  </h4>
                                  <p className="text-sm text-gray-500">{contact.title}</p>
                                  <div className="mt-2">
                                    <p className="text-sm">{contact.email}</p>
                                    <p className="text-sm">{contact.phone}</p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    setEditContact(contact);
                                    setShowContactForm(true);
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="contracts">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Contracts</h3>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditContract(null);
                          setShowContractForm(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Contract
                      </Button>
                    </div>
                    
                    {selectedVendor.contracts.length === 0 ? (
                      <div className="p-4 border rounded text-center text-gray-500">
                        <p>No contracts have been added for this vendor.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setEditContract(null);
                            setShowContractForm(true);
                          }}
                        >
                          Add First Contract
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedVendor.contracts.map(contract => (
                          <Card key={contract.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between">
                                <div>
                                  <h4 className="font-semibold flex items-center">
                                    {contract.title}
                                    <Badge 
                                      variant={getContractStatusColor(contract.status, contract.endDate) as any} 
                                      className="ml-2 text-xs"
                                    >
                                      {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                                    </Badge>
                                  </h4>
                                  <p className="text-sm text-gray-500">{contract.description}</p>
                                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                                    <span className="text-gray-500">Value:</span>
                                    <span>{formatCurrency(contract.value)}</span>
                                    
                                    <span className="text-gray-500">Period:</span>
                                    <span>{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</span>
                                    
                                    {contract.status === 'active' && getDaysUntilExpiration(contract.endDate) > 0 && (
                                      <>
                                        <span className="text-gray-500">Expires in:</span>
                                        <span>{getDaysUntilExpiration(contract.endDate)} days</span>
                                      </>
                                    )}
                                    
                                    {contract.renewalTerms && (
                                      <>
                                        <span className="text-gray-500">Renewal:</span>
                                        <span>{contract.renewalTerms}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => {
                                      setEditContract(contract);
                                      setShowContractForm(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  {contract.documentUrl && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                      onClick={() => window.open(contract.documentUrl, '_blank')}
                                    >
                                      View Doc
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditVendor(selectedVendor);
                  setSelectedVendor(null);
                  setShowVendorForm(true);
                }}
                className="mr-auto"
              >
                Edit Vendor
              </Button>
              <Button onClick={() => setSelectedVendor(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
      
      {/* Contract Form Dialog */}
      <Dialog open={showContractForm} onOpenChange={setShowContractForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editContract ? 'Edit Contract' : 'Add New Contract'}</DialogTitle>
            <DialogDescription>
              {selectedVendor && (
                <span>
                  {editContract ? 'Update' : 'Add'} contract for {selectedVendor.companyName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Contract Title*</label>
                <Input 
                  placeholder="Contract title"
                  value={editContract?.title || ""}
                  onChange={(e) => {
                    if (editContract) {
                      setEditContract({...editContract, title: e.target.value});
                    } else {
                      setContractForm({...contractForm, title: e.target.value});
                    }
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea 
                  placeholder="Contract description"
                  rows={2}
                  value={editContract?.description || ""}
                  onChange={(e) => {
                    if (editContract) {
                      setEditContract({...editContract, description: e.target.value});
                    } else {
                      setContractForm({...contractForm, description: e.target.value});
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Contract Value ($)</label>
                <Input 
                  placeholder="0.00"
                  type="number"
                  value={editContract?.value || ""}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (editContract) {
                      setEditContract({...editContract, value: value});
                    } else {
                      setContractForm({...contractForm, value: value});
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Renewal Terms</label>
                <Textarea 
                  placeholder="Renewal terms and conditions"
                  rows={2}
                  value={editContract?.renewalTerms || ""}
                  onChange={(e) => {
                    if (editContract) {
                      setEditContract({...editContract, renewalTerms: e.target.value});
                    } else {
                      setContractForm({...contractForm, renewalTerms: e.target.value});
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date*</label>
                <Input 
                  type="date"
                  value={editContract?.startDate || ""}
                  onChange={(e) => {
                    if (editContract) {
                      setEditContract({...editContract, startDate: e.target.value});
                    } else {
                      setContractForm({...contractForm, startDate: e.target.value});
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">End Date*</label>
                <Input 
                  type="date"
                  value={editContract?.endDate || ""}
                  onChange={(e) => {
                    if (editContract) {
                      setEditContract({...editContract, endDate: e.target.value});
                    } else {
                      setContractForm({...contractForm, endDate: e.target.value});
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={editContract?.status || contractForm.status}
                  onValueChange={(value: any) => {
                    if (editContract) {
                      setEditContract({...editContract, status: value});
                    } else {
                      setContractForm({...contractForm, status: value});
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="renewal">Up for Renewal</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Document URL</label>
                <Input 
                  placeholder="Link to contract document"
                  value={editContract?.documentUrl || ""}
                  onChange={(e) => {
                    if (editContract) {
                      setEditContract({...editContract, documentUrl: e.target.value});
                    } else {
                      setContractForm({...contractForm, documentUrl: e.target.value});
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL to the stored contract document
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            {editContract && (
              <Button
                variant="destructive"
                className="mr-auto"
                onClick={() => {
                  if (selectedVendor && editContract) {
                    // Remove the contract
                    const updatedContracts = selectedVendor.contracts.filter(c => c.id !== editContract.id);
                    const updatedVendor = {...selectedVendor, contracts: updatedContracts};
                    setVendors(vendors.map(v => v.id === selectedVendor.id ? updatedVendor : v));
                    setSelectedVendor(updatedVendor);
                    
                    toast({
                      title: 'Contract Removed',
                      description: `${editContract.title} has been removed.`,
                      variant: 'default',
                    });
                    
                    setEditContract(null);
                    setShowContractForm(false);
                  }
                }}
              >
                Delete Contract
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setEditContract(null);
                setShowContractForm(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedVendor) {
                  if (editContract) {
                    // Update existing contract
                    const updatedContracts = selectedVendor.contracts.map(c => 
                      c.id === editContract.id ? editContract : c
                    );
                    
                    const updatedVendor = {...selectedVendor, contracts: updatedContracts};
                    setVendors(vendors.map(v => v.id === selectedVendor.id ? updatedVendor : v));
                    setSelectedVendor(updatedVendor);
                    
                    toast({
                      title: 'Contract Updated',
                      description: `${editContract.title} has been updated.`,
                      variant: 'default',
                    });
                  } else {
                    // Create new contract
                    const newContract: VendorContract = {
                      id: `contract-${Date.now()}`,
                      title: contractForm.title || "New Contract",
                      description: contractForm.description,
                      startDate: contractForm.startDate || new Date().toISOString().split('T')[0],
                      endDate: contractForm.endDate || new Date(Date.now() + 31536000000).toISOString().split('T')[0], // One year from now
                      value: contractForm.value,
                      status: contractForm.status,
                      renewalTerms: contractForm.renewalTerms,
                      documentUrl: contractForm.documentUrl
                    };
                    
                    const updatedContracts = [...selectedVendor.contracts, newContract];
                    const updatedVendor = {...selectedVendor, contracts: updatedContracts};
                    setVendors(vendors.map(v => v.id === selectedVendor.id ? updatedVendor : v));
                    setSelectedVendor(updatedVendor);
                    
                    // Reset contract form
                    setContractForm({
                      title: '',
                      description: '',
                      startDate: '',
                      endDate: '',
                      value: 0,
                      status: 'active',
                      renewalTerms: '',
                      documentUrl: ''
                    });
                    
                    toast({
                      title: 'Contract Added',
                      description: `New contract has been added to ${selectedVendor.companyName}.`,
                      variant: 'default',
                    });
                  }
                  
                  setEditContract(null);
                  setShowContractForm(false);
                }
              }}
            >
              {editContract ? 'Update Contract' : 'Add Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorManagement; 