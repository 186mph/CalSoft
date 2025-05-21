import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Plus, Search, AlertCircle, BellRing, Award, Clock, Calendar, FileText, Filter, RefreshCw, Tag, Copy, User, Download, Eye, ExternalLink, Edit, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/Dialog';

// Types
interface Certification {
  id: string;
  employeeId: string;
  employeeName: string;
  certificationType: string;
  certificationName: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string;
  status: 'active' | 'expiring' | 'expired' | 'revoked';
  certificateNumber: string;
  verificationUrl?: string;
  notes?: string;
}

interface CertificationType {
  id: string;
  name: string;
  organization: string;
  validityPeriod: number; // in months
  description: string;
  isRequired: boolean;
  category: string;
}

const CertificationManagement: React.FC = () => {
  // States for managing certifications
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [filteredCertifications, setFilteredCertifications] = useState<Certification[]>([]);
  const [selectedCertification, setSelectedCertification] = useState<Certification | null>(null);
  const [certificationsTypes, setCertificationTypes] = useState<CertificationType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Mock data
  const mockCertificationTypes: CertificationType[] = [
    {
      id: '1',
      name: 'First Aid & CPR',
      organization: 'Red Cross',
      validityPeriod: 24, // 2 years
      description: 'Basic first aid and CPR certification',
      isRequired: true,
      category: 'Safety'
    },
    {
      id: '2',
      name: 'OSHA Safety Training',
      organization: 'OSHA',
      validityPeriod: 36, // 3 years
      description: 'Occupational Safety and Health Administration safety training',
      isRequired: true,
      category: 'Safety'
    },
    {
      id: '3',
      name: 'Project Management Professional (PMP)',
      organization: 'Project Management Institute',
      validityPeriod: 36, // 3 years
      description: 'Professional certification for project managers',
      isRequired: false,
      category: 'Professional'
    },
    {
      id: '4',
      name: 'Certified Information Systems Security Professional (CISSP)',
      organization: 'ISC²',
      validityPeriod: 36, // 3 years
      description: 'Advanced cybersecurity certification',
      isRequired: false,
      category: 'Technology'
    },
    {
      id: '5',
      name: 'Forklift Operation',
      organization: 'Company Internal',
      validityPeriod: 24, // 2 years
      description: 'Certification for operating forklifts and heavy machinery',
      isRequired: true,
      category: 'Operations'
    }
  ];

  const mockCertifications: Certification[] = [
    {
      id: '1',
      employeeId: '1',
      employeeName: 'John Doe',
      certificationType: 'First Aid & CPR',
      certificationName: 'Standard First Aid and CPR/AED',
      issuingOrganization: 'Red Cross',
      issueDate: '2022-03-15',
      expirationDate: '2024-03-15',
      status: 'active',
      certificateNumber: 'FA-12345',
      verificationUrl: 'https://redcross.org/verify/FA-12345',
      notes: 'Completed renewal training on schedule'
    },
    {
      id: '2',
      employeeId: '2',
      employeeName: 'Jane Smith',
      certificationType: 'OSHA Safety Training',
      certificationName: 'OSHA 30-Hour General Industry',
      issuingOrganization: 'OSHA',
      issueDate: '2021-07-10',
      expirationDate: '2024-07-10',
      status: 'active',
      certificateNumber: 'OSHA-GI-78912',
      verificationUrl: 'https://osha.gov/verify/78912'
    },
    {
      id: '3',
      employeeId: '3',
      employeeName: 'Robert Johnson',
      certificationType: 'Project Management Professional (PMP)',
      certificationName: 'Project Management Professional',
      issuingOrganization: 'Project Management Institute',
      issueDate: '2020-09-05',
      expirationDate: '2023-09-05',
      status: 'expired',
      certificateNumber: 'PMP-987654',
      verificationUrl: 'https://pmi.org/verify/987654',
      notes: 'Scheduled for renewal training next month'
    },
    {
      id: '4',
      employeeId: '1',
      employeeName: 'John Doe',
      certificationType: 'Forklift Operation',
      certificationName: 'Forklift Operator Certification',
      issuingOrganization: 'Company Internal',
      issueDate: '2022-11-20',
      expirationDate: '2024-11-20',
      status: 'active',
      certificateNumber: 'FLO-2022-45',
      notes: 'Completed with excellent practical exam results'
    },
    {
      id: '5',
      employeeId: '4',
      employeeName: 'Michael Brown',
      certificationType: 'Certified Information Systems Security Professional (CISSP)',
      certificationName: 'CISSP',
      issuingOrganization: 'ISC²',
      issueDate: '2021-12-10',
      expirationDate: '2023-12-10',
      status: 'expiring',
      certificateNumber: 'CISSP-456789',
      verificationUrl: 'https://isc2.org/verify/456789'
    },
    {
      id: '6',
      employeeId: '5',
      employeeName: 'Sarah Wilson',
      certificationType: 'First Aid & CPR',
      certificationName: 'Standard First Aid and CPR/AED',
      issuingOrganization: 'Red Cross',
      issueDate: '2021-05-25',
      expirationDate: '2023-05-25',
      status: 'expired',
      certificateNumber: 'FA-67890'
    }
  ];

  // Load mock data on component mount
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCertificationTypes(mockCertificationTypes);
      setCertifications(mockCertifications);
      setFilteredCertifications(mockCertifications);
      setLoading(false);
    }, 800);
  }, []);

  // Filter certifications based on search query and filters
  useEffect(() => {
    let results = certifications;
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(cert => 
        cert.employeeName.toLowerCase().includes(query) ||
        cert.certificationType.toLowerCase().includes(query) ||
        cert.certificationName.toLowerCase().includes(query) ||
        cert.issuingOrganization.toLowerCase().includes(query) ||
        cert.certificateNumber.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      results = results.filter(cert => cert.status === filterStatus);
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      results = results.filter(cert => cert.certificationType === filterType);
    }
    
    setFilteredCertifications(results);
  }, [searchQuery, filterStatus, filterType, certifications]);

  // Get unique certification types for filter
  const certificationTypeNames = ['all', ...new Set(certifications.map(cert => cert.certificationType))];

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch(status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'expiring':
        return <Badge className="bg-amber-100 text-amber-800">Expiring Soon</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      case 'revoked':
        return <Badge className="bg-gray-100 text-gray-800">Revoked</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Check if a date is within 30 days
  const isWithin30Days = (dateStr: string): boolean => {
    const today = new Date();
    const date = new Date(dateStr);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  // Calculate days until expiration
  const daysUntilExpiration = (dateStr: string): number => {
    const today = new Date();
    const date = new Date(dateStr);
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Simple certification card component
  const CertificationCard = ({ certification }: { certification: Certification }) => {
    const daysUntil = daysUntilExpiration(certification.expirationDate);
    const isExpired = daysUntil < 0;
    const isExpiring = !isExpired && daysUntil <= 30;
    
    return (
      <Card className="h-full">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Award className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">{certification.certificationName}</h3>
                <p className="text-sm text-gray-500">{certification.employeeName}</p>
              </div>
            </div>
            <StatusBadge status={certification.status} />
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-gray-500" />
              <span>{certification.issuingOrganization}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>Issued: {new Date(certification.issueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className={`h-4 w-4 ${isExpired ? 'text-red-500' : isExpiring ? 'text-amber-500' : 'text-gray-500'}`} />
              <span className={isExpired ? 'text-red-500' : isExpiring ? 'text-amber-500' : ''}>
                {isExpired ? 
                  `Expired ${Math.abs(daysUntil)} days ago` : 
                  `Expires: ${new Date(certification.expirationDate).toLocaleDateString()} (${daysUntil} days)`}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">ID: {certification.certificateNumber}</p>
            <Button 
              size="sm" 
              onClick={() => {
                setSelectedCertification(certification);
                setIsDetailDialogOpen(true);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Handle renewal action
  const handleRenewal = (certification: Certification) => {
    toast.success(`Renewal process initiated for ${certification.certificationName}`);
    // In a real app, this would open a renewal workflow
  };

  // Copy certificate number to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Certificate number copied to clipboard');
  };

  // Certification Detail Dialog Component
  const CertificationDetailDialog = () => {
    if (!selectedCertification) return null;
    
    const daysUntil = daysUntilExpiration(selectedCertification.expirationDate);
    const isExpired = daysUntil < 0;
    const isExpiring = !isExpired && daysUntil <= 30;
    
    return (
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Award className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{selectedCertification.certificationName}</DialogTitle>
                  <DialogDescription className="text-sm">
                    {selectedCertification.issuingOrganization} • Certificate #{selectedCertification.certificateNumber}
                  </DialogDescription>
                </div>
              </div>
              <StatusBadge status={selectedCertification.status} />
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-2 flex-1 overflow-hidden flex flex-col">
            <TabsList className="mb-2">
              <TabsTrigger value="details" className="text-xs px-2 py-1">Certificate Details</TabsTrigger>
              <TabsTrigger value="employee" className="text-xs px-2 py-1">Employee Info</TabsTrigger>
              <TabsTrigger value="renewal" className="text-xs px-2 py-1">Renewal Options</TabsTrigger>
            </TabsList>
            
            <div className="overflow-y-auto pr-1 flex-1">
              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-base font-medium mb-2">Certificate Information</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">Certification Type</Label>
                        <p className="font-medium text-sm">{selectedCertification.certificationType}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Certificate Number</Label>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{selectedCertification.certificateNumber}</p>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(selectedCertification.certificateNumber)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {selectedCertification.verificationUrl && (
                        <div>
                          <Label className="text-xs text-gray-500">Verification URL</Label>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-blue-600">
                              <a href={selectedCertification.verificationUrl} target="_blank" rel="noreferrer" className="flex items-center">
                                Verify Certificate
                                <ExternalLink className="h-3.5 w-3.5 ml-1" />
                              </a>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-medium mb-2">Timeline</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">Issue Date</Label>
                        <p className="font-medium text-sm">{new Date(selectedCertification.issueDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Expiration Date</Label>
                        <p className={`font-medium text-sm ${isExpired ? 'text-red-500' : isExpiring ? 'text-amber-500' : ''}`}>
                          {new Date(selectedCertification.expirationDate).toLocaleDateString()}
                          {' '}
                          {isExpired 
                            ? `(Expired ${Math.abs(daysUntil)} days ago)` 
                            : `(${daysUntil} days remaining)`}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Status</Label>
                        <div className="mt-1">
                          <StatusBadge status={selectedCertification.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedCertification.notes && (
                    <div className="md:col-span-2">
                      <h3 className="text-base font-medium mb-2">Notes</h3>
                      <div className="p-3 bg-gray-50 rounded-md text-sm">
                        {selectedCertification.notes}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="employee" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium">{selectedCertification.employeeName}</h3>
                      <p className="text-sm text-gray-500">Employee ID: {selectedCertification.employeeId}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-md p-3">
                      <h4 className="text-xs font-medium mb-2">Department</h4>
                      <p className="text-sm">Engineering</p>
                    </div>
                    <div className="border rounded-md p-3">
                      <h4 className="text-xs font-medium mb-2">Position</h4>
                      <p className="text-sm">Senior Engineer</p>
                    </div>
                    <div className="border rounded-md p-3">
                      <h4 className="text-xs font-medium mb-2">Required Certifications</h4>
                      <p className="text-sm">3 of 4 active</p>
                    </div>
                    <div className="border rounded-md p-3">
                      <h4 className="text-xs font-medium mb-2">Next Renewal</h4>
                      <p className="text-sm">OSHA Safety (45 days)</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="renewal" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium">Renewal Options</h3>
                    {isExpired || isExpiring ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRenewal(selectedCertification)}>
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Start Renewal Process
                      </Button>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">No action needed</Badge>
                    )}
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <h4 className="font-medium text-sm">Renewal Requirements</h4>
                    </div>
                    <div className="p-3">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Complete renewal application</p>
                            <p className="text-xs text-gray-500">Submit application at least 30 days before expiration</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Attend refresher training</p>
                            <p className="text-xs text-gray-500">Complete the required renewal courses</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Pay renewal fee</p>
                            <p className="text-xs text-gray-500">Reimbursable with manager approval</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <DialogFooter className="flex justify-between items-center mt-3 pt-3 border-t">
            <div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsDetailDialogOpen(false)}>
                Close
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => handleRenewal(selectedCertification)}>
                {isExpired || isExpiring ? 'Renew Certificate' : 'Update'}
              </Button>
              <Button size="sm" className="h-7 text-xs">
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Certification Management</CardTitle>
              <CardDescription>Track employee certifications, expirations, and renewals</CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Add Certification
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                      <p className="text-2xl font-semibold">
                        {certifications.filter(c => c.status === 'active').length}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-full">
                      <BellRing className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Soon</p>
                      <p className="text-2xl font-semibold">
                        {certifications.filter(c => c.status === 'expiring').length}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Expired</p>
                      <p className="text-2xl font-semibold">
                        {certifications.filter(c => c.status === 'expired').length}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Certification Types</p>
                      <p className="text-2xl font-semibold">
                        {certificationsTypes.length}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search certifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="w-40">
                <SelectRoot value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </SelectRoot>
              </div>
              <div className="w-56">
                <SelectRoot value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <Award className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Certification Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {certificationTypeNames.filter(t => t !== 'all').map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </div>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setFilterType('all');
              }}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="h-[200px] animate-pulse">
                  <CardContent className="pt-6">
                    <div className="flex justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                        <div className="space-y-1">
                          <div className="h-4 w-32 bg-gray-200 rounded"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="h-5 w-16 bg-gray-200 rounded"></div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-4 w-full bg-gray-200 rounded"></div>
                      <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                      <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                      <div className="h-8 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCertifications.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No certifications found</h3>
              <p className="text-gray-500">
                {searchQuery || filterStatus !== 'all' || filterType !== 'all' ? 
                  'Try adjusting your search or filters' : 
                  'Add your first certification to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCertifications.map(certification => (
                <CertificationCard key={certification.id} certification={certification} />
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredCertifications.length} of {certifications.length} certifications
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <BellRing className="h-4 w-4 mr-1" />
              Send Reminders
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-1" />
              Report
            </Button>
          </div>
        </CardFooter>
      </Card>

      {selectedCertification && <CertificationDetailDialog />}
    </div>
  );
};

export default CertificationManagement; 