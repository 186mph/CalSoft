'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Calendar, Edit, Trash2, Users, Heart, Shield, Briefcase, DollarSign, 
         Eye, ExternalLink, ArrowRight, Download, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { SelectRoot } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/Dialog';

type BenefitPlan = {
  id: string;
  name: string;
  type: BenefitType;
  provider: string;
  coverage: string;
  cost: number;
  employeeContribution: number;
  companyContribution: number;
  enrollmentStatus: EnrollmentStatus;
  enrollmentDate?: string;
  renewalDate?: string;
  eligibility: string;
  description: string;
};

type BenefitType = 'health' | 'dental' | 'vision' | 'life' | 'retirement' | 'wellness';

type EnrollmentStatus = 'enrolled' | 'eligible' | 'pending' | 'waived' | 'expired';

const BenefitsManagement = () => {
  const [benefitPlans, setBenefitPlans] = useState<BenefitPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<BenefitPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BenefitPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<BenefitType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<EnrollmentStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all-benefits');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Mock data for benefit plans
  useEffect(() => {
    const mockBenefitPlans: BenefitPlan[] = [
      {
        id: '1',
        name: 'Premium Health Plan',
        type: 'health',
        provider: 'Blue Cross Blue Shield',
        coverage: 'Comprehensive medical coverage with low deductibles',
        cost: 850,
        employeeContribution: 150,
        companyContribution: 700,
        enrollmentStatus: 'enrolled',
        enrollmentDate: '2023-01-15',
        renewalDate: '2023-12-31',
        eligibility: 'Full-time employees after 30 days',
        description: 'A comprehensive health insurance plan covering medical, emergency, and specialty services with nationwide coverage.',
      },
      {
        id: '2',
        name: 'Dental Plus',
        type: 'dental',
        provider: 'Delta Dental',
        coverage: 'Preventative and restorative care',
        cost: 95,
        employeeContribution: 25,
        companyContribution: 70,
        enrollmentStatus: 'eligible',
        renewalDate: '2023-12-31',
        eligibility: 'All employees',
        description: 'Covers routine cleanings, fillings, and major procedures with a network of qualified dentists.',
      },
      {
        id: '3',
        name: 'Vision Care',
        type: 'vision',
        provider: 'VSP',
        coverage: 'Eye exams, glasses, and contacts',
        cost: 45,
        employeeContribution: 15,
        companyContribution: 30,
        enrollmentStatus: 'waived',
        renewalDate: '2023-12-31',
        eligibility: 'All employees',
        description: 'Annual eye exams, frames allowance, and discounts on lens upgrades and LASIK procedures.',
      },
      {
        id: '4',
        name: '401(k) Retirement Plan',
        type: 'retirement',
        provider: 'Fidelity',
        coverage: 'Retirement savings with company match',
        cost: 0,
        employeeContribution: 0,
        companyContribution: 0,
        enrollmentStatus: 'enrolled',
        enrollmentDate: '2022-03-10',
        eligibility: 'Full-time employees after 90 days',
        description: 'Company matches 100% of the first 3% contributed and 50% of the next 2%. Immediate vesting.',
      },
      {
        id: '5',
        name: 'Life Insurance',
        type: 'life',
        provider: 'MetLife',
        coverage: '2x annual salary',
        cost: 65,
        employeeContribution: 0,
        companyContribution: 65,
        enrollmentStatus: 'enrolled',
        enrollmentDate: '2022-03-10',
        renewalDate: '2023-12-31',
        eligibility: 'Full-time employees',
        description: 'Company-paid life insurance equal to twice your annual salary with option for supplemental coverage.',
      },
      {
        id: '6',
        name: 'Wellness Program',
        type: 'wellness',
        provider: 'WellnessComplete',
        coverage: 'Gym membership, health coaching',
        cost: 75,
        employeeContribution: 25,
        companyContribution: 50,
        enrollmentStatus: 'pending',
        eligibility: 'All employees',
        description: 'Includes gym reimbursement, health coaching, and incentives for participating in wellness activities.',
      },
    ];

    setTimeout(() => {
      setBenefitPlans(mockBenefitPlans);
      setFilteredPlans(mockBenefitPlans);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Filter benefit plans based on search query and filters
  useEffect(() => {
    let result = [...benefitPlans];

    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      result = result.filter(
        plan =>
          plan.name.toLowerCase().includes(lowercaseQuery) ||
          plan.provider.toLowerCase().includes(lowercaseQuery) ||
          plan.description.toLowerCase().includes(lowercaseQuery)
      );
    }

    if (filterType !== 'all') {
      result = result.filter(plan => plan.type === filterType);
    }

    if (filterStatus !== 'all') {
      result = result.filter(plan => plan.enrollmentStatus === filterStatus);
    }

    setFilteredPlans(result);
  }, [benefitPlans, searchQuery, filterType, filterStatus]);

  const getBenefitTypeIcon = (type: BenefitType) => {
    switch (type) {
      case 'health':
        return <Heart className="h-4 w-4 mr-1" />;
      case 'dental':
        return <Briefcase className="h-4 w-4 mr-1" />;
      case 'vision':
        return <Search className="h-4 w-4 mr-1" />;
      case 'life':
        return <Shield className="h-4 w-4 mr-1" />;
      case 'retirement':
        return <DollarSign className="h-4 w-4 mr-1" />;
      case 'wellness':
        return <Users className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  const StatusBadge = ({ status }: { status: EnrollmentStatus }) => {
    const variants: Record<EnrollmentStatus, { color: string; text: string }> = {
      enrolled: { color: 'green', text: 'Enrolled' },
      eligible: { color: 'blue', text: 'Eligible' },
      pending: { color: 'yellow', text: 'Pending' },
      waived: { color: 'gray', text: 'Waived' },
      expired: { color: 'red', text: 'Expired' },
    };

    return (
      <Badge variant={variants[status].color as any}>
        {variants[status].text}
      </Badge>
    );
  };

  const BenefitPlanCard = ({ plan }: { plan: BenefitPlan }) => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium">
              <span className="flex items-center">
                {getBenefitTypeIcon(plan.type)}
                {plan.name}
              </span>
            </CardTitle>
            <CardDescription>{plan.provider}</CardDescription>
          </div>
          <StatusBadge status={plan.enrollmentStatus} />
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coverage:</span>
            <span className="font-medium">{plan.coverage}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost:</span>
            <span className="font-medium">${plan.cost}/month</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your Contribution:</span>
            <span className="font-medium">${plan.employeeContribution}/month</span>
          </div>
          {plan.renewalDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Renewal:</span>
              <span className="font-medium flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                {plan.renewalDate}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="primary" 
          size="sm" 
          className="w-full"
          onClick={() => {
            setSelectedPlan(plan);
            setIsDetailDialogOpen(true);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          {plan.enrollmentStatus === 'enrolled' ? 'View Details' : 
           plan.enrollmentStatus === 'eligible' ? 'Enroll Now' : 
           plan.enrollmentStatus === 'pending' ? 'Complete Enrollment' : 
           'View Options'}
        </Button>
      </CardFooter>
    </Card>
  );

  // Benefits Detail Dialog Component
  const BenefitDetailDialog = () => {
    if (!selectedPlan) return null;
    
    return (
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center">
                  {getBenefitTypeIcon(selectedPlan.type)}
                  {selectedPlan.name}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {selectedPlan.provider}
                </DialogDescription>
              </div>
              <StatusBadge status={selectedPlan.enrollmentStatus} />
            </div>
          </DialogHeader>

          <Tabs defaultValue="summary" className="mt-2 flex-1 overflow-hidden flex flex-col">
            <TabsList className="mb-2">
              <TabsTrigger value="summary" className="text-xs px-2 py-1">Plan Summary</TabsTrigger>
              <TabsTrigger value="coverage" className="text-xs px-2 py-1">Coverage Details</TabsTrigger>
              <TabsTrigger value="costs" className="text-xs px-2 py-1">Costs & Contributions</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs px-2 py-1">Documents</TabsTrigger>
            </TabsList>
            
            <div className="overflow-y-auto pr-1 flex-1">
              <TabsContent value="summary" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-base font-medium mb-2">Plan Information</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">Plan Type</Label>
                        <p className="font-medium text-sm capitalize">{selectedPlan.type}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Provider</Label>
                        <p className="font-medium text-sm">{selectedPlan.provider}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Eligibility</Label>
                        <p className="font-medium text-sm">{selectedPlan.eligibility}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-medium mb-2">Your Status</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500">Enrollment Status</Label>
                        <div className="mt-1">
                          <StatusBadge status={selectedPlan.enrollmentStatus} />
                        </div>
                      </div>
                      {selectedPlan.enrollmentDate && (
                        <div>
                          <Label className="text-xs text-gray-500">Enrollment Date</Label>
                          <p className="font-medium text-sm">{selectedPlan.enrollmentDate}</p>
                        </div>
                      )}
                      {selectedPlan.renewalDate && (
                        <div>
                          <Label className="text-xs text-gray-500">Next Renewal</Label>
                          <p className="font-medium text-sm">{selectedPlan.renewalDate}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h3 className="text-base font-medium mb-2">Plan Description</h3>
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      {selectedPlan.description}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="coverage" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Coverage Details</h3>
                  
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <h4 className="font-medium text-sm">What's Covered</h4>
                    </div>
                    <div className="p-4">
                      <p className="text-sm mb-4">{selectedPlan.coverage}</p>
                      
                      <div className="space-y-3">
                        {selectedPlan.type === 'health' && (
                          <>
                            <div className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Primary Care</p>
                                <p className="text-xs text-gray-500">$20 copay per visit</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Specialist Visits</p>
                                <p className="text-xs text-gray-500">$40 copay per visit</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Emergency Room</p>
                                <p className="text-xs text-gray-500">$250 copay per visit (waived if admitted)</p>
                              </div>
                            </div>
                          </>
                        )}
                        
                        {selectedPlan.type === 'dental' && (
                          <>
                            <div className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Preventative Care</p>
                                <p className="text-xs text-gray-500">100% covered, no deductible</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Basic Procedures</p>
                                <p className="text-xs text-gray-500">80% coverage after deductible</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Major Procedures</p>
                                <p className="text-xs text-gray-500">50% coverage after deductible</p>
                              </div>
                            </div>
                          </>
                        )}
                        
                        {selectedPlan.type === 'vision' && (
                          <>
                            <div className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Eye Exams</p>
                                <p className="text-xs text-gray-500">$10 copay, once per year</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Frames</p>
                                <p className="text-xs text-gray-500">$150 allowance every 24 months</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Contact Lenses</p>
                                <p className="text-xs text-gray-500">$150 allowance per year (in lieu of glasses)</p>
                              </div>
                            </div>
                          </>
                        )}
                        
                        {(['retirement', 'life', 'wellness'].includes(selectedPlan.type)) && (
                          <div className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5" />
                            <div>
                              <p className="text-sm">{selectedPlan.coverage}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="costs" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Plan Costs & Contributions</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-md p-4">
                      <h4 className="text-sm font-medium mb-2">Total Monthly Cost</h4>
                      <p className="text-2xl font-bold text-blue-600">${selectedPlan.cost}</p>
                      <p className="text-xs text-gray-500 mt-1">Per month</p>
                    </div>
                    <div className="border rounded-md p-4">
                      <h4 className="text-sm font-medium mb-2">Your Contribution</h4>
                      <p className="text-2xl font-bold text-blue-600">${selectedPlan.employeeContribution}</p>
                      <p className="text-xs text-gray-500 mt-1">Per month</p>
                    </div>
                    <div className="border rounded-md p-4">
                      <h4 className="text-sm font-medium mb-2">Company Contribution</h4>
                      <p className="text-2xl font-bold text-blue-600">${selectedPlan.companyContribution}</p>
                      <p className="text-xs text-gray-500 mt-1">Per month</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h4 className="text-sm font-medium mb-3">Cost Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Monthly Premium</span>
                        <span className="text-sm font-medium">${selectedPlan.cost}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Your Contribution</span>
                        <span className="text-sm font-medium">${selectedPlan.employeeContribution}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Company Contribution</span>
                        <span className="text-sm font-medium">${selectedPlan.companyContribution}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Annual You Pay</span>
                          <span className="text-sm font-bold">${selectedPlan.employeeContribution * 12}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="documents" className="mt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-medium">Plan Documents</h3>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <div className="divide-y">
                      <div className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-600 mr-2" />
                            <div>
                              <p className="font-medium text-sm">Summary Plan Description</p>
                              <p className="text-xs text-gray-500">PDF, 1.2MB</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-600 mr-2" />
                            <div>
                              <p className="font-medium text-sm">Benefits Guide</p>
                              <p className="text-xs text-gray-500">PDF, 3.5MB</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-600 mr-2" />
                            <div>
                              <p className="font-medium text-sm">Plan Forms</p>
                              <p className="text-xs text-gray-500">PDF, 0.8MB</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
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
              {selectedPlan.enrollmentStatus === 'enrolled' && (
                <Button size="sm" className="h-7 text-xs" variant="outline">
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Update Coverage
                </Button>
              )}
              
              {selectedPlan.enrollmentStatus === 'eligible' && (
                <Button size="sm" className="h-7 text-xs">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Enroll Now
                </Button>
              )}
              
              {selectedPlan.enrollmentStatus === 'pending' && (
                <Button size="sm" className="h-7 text-xs">
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                  Complete Enrollment
                </Button>
              )}
              
              {selectedPlan.enrollmentStatus === 'waived' && (
                <Button size="sm" className="h-7 text-xs">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Review Options
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Benefits Management</h2>
          <p className="text-muted-foreground">
            View and manage employee benefits plans and enrollment
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add New Benefit Plan
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search benefit plans..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <SelectRoot value={filterType} onValueChange={(value) => setFilterType(value as BenefitType | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Benefit Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="dental">Dental</SelectItem>
              <SelectItem value="vision">Vision</SelectItem>
              <SelectItem value="life">Life Insurance</SelectItem>
              <SelectItem value="retirement">Retirement</SelectItem>
              <SelectItem value="wellness">Wellness</SelectItem>
            </SelectContent>
          </SelectRoot>
          <SelectRoot value={filterStatus} onValueChange={(value) => setFilterStatus(value as EnrollmentStatus | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="eligible">Eligible</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </SelectRoot>
        </div>
      </div>

      <Tabs defaultValue="all-benefits" className="w-full">
        <TabsList>
          <TabsTrigger value="all-benefits">All Benefits</TabsTrigger>
          <TabsTrigger value="my-benefits">My Benefits</TabsTrigger>
          <TabsTrigger value="available-benefits">Available Plans</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-benefits" className="mt-4">
          {isLoading ? (
            <div className="text-center py-10">Loading benefits plans...</div>
          ) : filteredPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => (
                <BenefitPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No benefit plans found matching your criteria.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-benefits" className="mt-4">
          {isLoading ? (
            <div className="text-center py-10">Loading your benefits...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans
                .filter(plan => plan.enrollmentStatus === 'enrolled')
                .map((plan) => (
                  <BenefitPlanCard key={plan.id} plan={plan} />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available-benefits" className="mt-4">
          {isLoading ? (
            <div className="text-center py-10">Loading available plans...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans
                .filter(plan => plan.enrollmentStatus === 'eligible')
                .map((plan) => (
                  <BenefitPlanCard key={plan.id} plan={plan} />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedPlan && <BenefitDetailDialog />}
    </div>
  );
};

export default BenefitsManagement; 