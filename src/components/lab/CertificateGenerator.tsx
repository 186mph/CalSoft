import React, { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectOption } from '@/components/ui/Select';
import { 
  Plus, 
  Save, 
  Edit, 
  Trash2, 
  FileText,
  Download,
  Mail,
  CheckCircle,
  AlertTriangle,
  Search,
  Clock,
  User
} from 'lucide-react';
import { labService, Certificate, LabEquipment, Calibration } from '@/lib/services/labService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/toast';

// Define the certificate types and status options with proper types
const certificateTypes: SelectOption[] = [
  { value: 'calibration', label: 'Calibration Certificate' },
  { value: 'compliance', label: 'Compliance Certificate' },
  { value: 'test-report', label: 'Test Report' },
  { value: 'inspection', label: 'Inspection Certificate' },
  { value: 'verification', label: 'Verification Certificate' },
  { value: 'other', label: 'Other Certificate' }
];

const statusOptions: SelectOption[] = [
  { value: 'valid', label: 'Valid' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' }
];

interface CertificateGeneratorProps {
  division?: string;
}

export function CertificateGenerator({ division }: CertificateGeneratorProps) {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [equipment, setEquipment] = useState<LabEquipment[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [customers, setCustomers] = useState<{ id: string, name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Selected certificate for viewing/editing
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  
  // Certificate template preview
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);
  
  const defaultFormState: Partial<Certificate> = {
    certificate_number: '',
    certificate_type: 'calibration',
    issued_date: new Date().toISOString().split('T')[0],
    issued_to: '',
    issued_by: user?.id,
    equipment_id: '',
    calibration_id: '',
    expiration_date: '',
    status: 'valid',
    notes: ''
  };
  
  const [form, setForm] = useState<Partial<Certificate>>(defaultFormState);
  const [logoImage, setLogoImage] = useState<File | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch certificates
        const certResponse = await labService.getCertificates();
        if (certResponse.error) {
          setError("Failed to load certificates. Please try again.");
        } else if (certResponse.data) {
          // Use a type assertion to ensure we're working with valid Certificate objects
          const validCertificates = certResponse.data.filter(cert => cert !== null) as Certificate[];
          setCertificates(validCertificates);
        }
        
        // Fetch equipment for selecting in certificates
        const equipResponse = await labService.getEquipment();
        if (!equipResponse.error && equipResponse.data) {
          setEquipment(equipResponse.data);
        }
        
        // Fetch customers
        // In a real implementation, this would be from the customer service
        // For demo purposes, we'll use mock data
        setCustomers([
          { id: '1', name: 'Acme Industries' },
          { id: '2', name: 'TechCorp Inc.' },
          { id: '3', name: 'Quantum Electronics' },
          { id: '4', name: 'PowerGrid Solutions' }
        ]);
        
        setError(null);
      } catch (err) {
        console.error("Exception in certificate generator:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Function to handle filtering certificates - ensure type safety
  const getFilteredCertificates = () => {
    return certificates.filter(certificate => {
      // Check for valid certificate first
      if (!certificate) return false;
      
      // Filter by tab (status)
      if (activeTab !== 'all' && certificate.status !== activeTab) {
        return false;
      }
      
      // Filter by search term
      const matchesSearch = 
        searchTerm === '' || 
        certificate.certificate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        certificate.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        certificate.issued_to.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by customer
      const matchesCustomer = customerFilter === null || certificate.issued_to === customerFilter;
      
      // Filter by type
      const matchesType = typeFilter === null || certificate.certificate_type === typeFilter;
      
      return matchesSearch && matchesCustomer && matchesType;
    });
  };

  const filteredCertificates = getFilteredCertificates();

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle equipment selection - load related calibrations
  const handleEquipmentChange = async (equipmentId: string) => {
    setForm(prev => ({ ...prev, equipment_id: equipmentId, calibration_id: '' }));
    
    if (equipmentId) {
      try {
        const response = await labService.getCalibrations(equipmentId);
        if (!response.error && response.data) {
          // Filter out any null values before setting calibrations
          setCalibrations(response.data.filter(calibration => calibration !== null));
        }
      } catch (err) {
        console.error("Failed to load calibrations:", err);
      }
    } else {
      setCalibrations([]);
    }
  };

  // Handle logo image upload
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setLogoImage(files[0]);
    }
  };

  // Generate certificate number
  const generateCertificateNumber = () => {
    const prefix = form.certificate_type?.substring(0, 3).toUpperCase() || 'CERT';
    const date = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${date}-${random}`;
  };

  // Handle certificate creation/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Generate certificate number if not provided
      if (!form.certificate_number) {
        form.certificate_number = generateCertificateNumber();
      }
      
      // Save certificate
      const response = await labService.saveCertificate(form);
      
      if (response.error) {
        toast({
          title: "Error",
          description: "Failed to save certificate. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      // Update certificates list
      if (editingCertificateId) {
        if (response.data) {
          const newCertificate = response.data;
          setCertificates(prev => prev.map(cert => 
            cert.id === editingCertificateId ? newCertificate : cert
          ));
          toast({
            title: "Success",
            description: "Certificate updated successfully"
          });
        }
      } else {
        if (response.data) {
          const newCertificate = response.data;
          setCertificates(prev => [...prev, newCertificate]);
          toast({
            title: "Success",
            description: "Certificate created successfully"
          });
        }
      }
      
      // Reset form
      setForm(defaultFormState);
      setShowForm(false);
      setEditingCertificateId(null);
      
    } catch (err) {
      console.error("Error saving certificate:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (certificate: Certificate) => {
    setEditingCertificateId(certificate.id);
    setForm({
      ...certificate
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this certificate? This action cannot be undone.")) {
      try {
        const response = await labService.deleteCertificate(id);
        
        if (response.error) {
          toast({
            title: "Error",
            description: "Failed to delete certificate. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        // Update certificates list - filter out nulls and the deleted certificate
        setCertificates(prev => prev.filter(cert => cert !== null && cert.id !== id));
        
        toast({
          title: "Success",
          description: "Certificate deleted successfully"
        });
      } catch (err) {
        console.error("Error deleting certificate:", err);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" | null | undefined => {
    switch (status) {
      case 'valid': return 'secondary';
      case 'expired': return 'default';
      case 'revoked': return 'destructive';
      default: return 'outline';
    }
  };

  const handleGeneratePDF = async (certificate: Certificate) => {
    try {
      setIsLoading(true);
      
      // In a real implementation, this would call a PDF generation service
      // For demo purposes, we'll just show a success message
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Success",
        description: "Certificate PDF generated successfully"
      });
      
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailCertificate = async (certificate: Certificate) => {
    try {
      setIsLoading(true);
      
      // In a real implementation, this would call an email service
      // For demo purposes, we'll just show a success message
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Success",
        description: "Certificate email sent successfully"
      });
      
    } catch (err) {
      console.error("Error sending email:", err);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Certificate Management</h2>
        <Button onClick={() => {
          setEditingCertificateId(null);
          setForm(defaultFormState);
          setShowForm(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Certificate
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
      
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search certificates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4 mb-4">
          <Select
            value={typeFilter || ''}
            onChange={(e) => setTypeFilter(e.target.value === '' ? null : e.target.value)}
            className="min-w-[200px]"
            options={[
              { value: '', label: 'All Certificate Types' },
              ...certificateTypes
            ]}
          />
          
          <Select
            value={customerFilter || ''}
            onChange={(e) => setCustomerFilter(e.target.value === '' ? null : e.target.value)}
            className="min-w-[200px]"
            options={[
              { value: '', label: 'All Customers' },
              ...customers.map(c => ({ value: c.id, label: c.name }))
            ]}
          />
        </div>
      </div>
      
      {/* Tabs for certificate status filter */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Certificates</TabsTrigger>
          <TabsTrigger value="valid">Valid</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="revoked">Revoked</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-10">
              <p>Loading certificates...</p>
            </div>
          ) : (
            <>
              {filteredCertificates.length === 0 ? (
                <div className="text-center py-10 border rounded-md">
                  <FileText className="mx-auto h-10 w-10 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No certificates found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create your first certificate to get started.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => {
                      setEditingCertificateId(null);
                      setForm(defaultFormState);
                      setShowForm(true);
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Certificate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCertificates.map(certificate => (
                    <Card key={certificate.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{certificate.certificate_number}</CardTitle>
                          <Badge variant={getStatusBadgeVariant(certificate.status)}>
                            {certificate.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {certificateTypes.find(t => t.value === certificate.certificate_type)?.label || certificate.certificate_type}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Issued To:</span>
                            <span className="text-sm">{customers.find(c => c.id === certificate.issued_to)?.name || certificate.issued_to}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Issued Date:</span>
                            <span className="text-sm">{new Date(certificate.issued_date).toLocaleDateString()}</span>
                          </div>
                          {certificate.expiration_date && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Expires:</span>
                              <span className="text-sm">{new Date(certificate.expiration_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {certificate.equipment_name && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Equipment:</span>
                              <span className="text-sm">{certificate.equipment_name}</span>
                            </div>
                          )}
                          <div className="pt-4 flex justify-end space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(certificate)}>
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEmailCertificate(certificate)}>
                              <Mail className="h-4 w-4 mr-1" />
                              Email
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(certificate)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(certificate.id)}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Certificate Form Dialog */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingCertificateId ? 'Edit Certificate' : 'Create New Certificate'}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Certificate Number</label>
                  <div className="flex space-x-2">
                    <Input
                      name="certificate_number"
                      value={form.certificate_number || ''}
                      onChange={handleInputChange}
                      placeholder="Auto-generated if blank"
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setForm({...form, certificate_number: generateCertificateNumber()})}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Certificate Type</label>
                  <Select
                    name="certificate_type"
                    value={form.certificate_type || 'calibration'}
                    onChange={handleInputChange}
                    className="w-full"
                    options={certificateTypes}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Issue Date</label>
                  <Input
                    type="date"
                    name="issued_date"
                    value={form.issued_date || ''}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Expiration Date (Optional)</label>
                  <Input
                    type="date"
                    name="expiration_date"
                    value={form.expiration_date || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Customer</label>
                <Select
                  name="issued_to"
                  value={form.issued_to || ''}
                  onChange={handleInputChange}
                  className="w-full"
                  options={customers.map(c => ({
                    value: c.id,
                    label: c.name
                  }))}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Equipment</label>
                  <Select
                    name="equipment_id"
                    value={form.equipment_id || ''}
                    onChange={(e) => handleEquipmentChange(e.target.value)}
                    className="w-full"
                    options={[
                      { value: '', label: 'Select Equipment' },
                      ...equipment.map(eq => ({
                        value: eq.id,
                        label: eq.name
                      }))
                    ]}
                  />
                </div>
                
                {form.equipment_id && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Related Calibration (Optional)</label>
                    <Select
                      name="calibration_id"
                      value={form.calibration_id || ''}
                      onChange={handleInputChange}
                      className="w-full"
                      options={[
                        { value: '', label: 'Select Calibration' },
                        ...calibrations.map(cal => ({
                          value: cal.id,
                          label: `${new Date(cal.calibration_date).toLocaleDateString()} - ${cal.performed_by || 'Unknown'}`
                        }))
                      ]}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Certificate Status</label>
                <Select
                  name="status"
                  value={form.status || 'valid'}
                  onChange={handleInputChange}
                  className="w-full"
                  options={statusOptions}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <Textarea
                  name="notes"
                  value={form.notes || ''}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Additional information or special conditions..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Company Logo (Optional)</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                <p className="mt-1 text-sm text-gray-500">This logo will appear on the certificate PDF.</p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingCertificateId ? 'Update Certificate' : 'Create Certificate')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Certificate Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          <div className="p-4 border rounded-md bg-white">
            {selectedCertificate && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="text-xl font-bold">Company Logo</h3>
                    <p className="text-sm text-gray-500">Placeholder for company logo</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-lg font-bold">Certificate #{selectedCertificate.certificate_number}</h3>
                    <p className="text-sm">Issue Date: {new Date(selectedCertificate.issued_date).toLocaleDateString()}</p>
                    {selectedCertificate.expiration_date && (
                      <p className="text-sm">Expiry Date: {new Date(selectedCertificate.expiration_date).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                
                <div className="text-center">
                  <h2 className="text-2xl font-bold uppercase">
                    {certificateTypes.find(t => t.value === selectedCertificate.certificate_type)?.label}
                  </h2>
                  <p className="text-lg">This is to certify that</p>
                </div>
                
                <div className="border-t border-b py-4">
                  <h3 className="text-lg font-bold">Customer Information</h3>
                  <p>{customers.find(c => c.id === selectedCertificate.issued_to)?.name || selectedCertificate.issued_to}</p>
                </div>
                
                {selectedCertificate.equipment_name && (
                  <div className="border-b py-4">
                    <h3 className="text-lg font-bold">Equipment Details</h3>
                    <p><span className="font-medium">Name:</span> {selectedCertificate.equipment_name}</p>
                    {/* Add more equipment details here */}
                  </div>
                )}
                
                <div className="border-b py-4">
                  <h3 className="text-lg font-bold">Certificate Details</h3>
                  <p>{selectedCertificate.notes || 'No additional details provided.'}</p>
                </div>
                
                <div className="mt-8 flex justify-between items-end">
                  <div>
                    <p className="font-medium">Issued By:</p>
                    <p>{selectedCertificate.issuer_name || 'Authorized Signatory'}</p>
                  </div>
                  <div className="text-center border-t border-black pt-2 w-48">
                    <p>Authorized Signature</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 