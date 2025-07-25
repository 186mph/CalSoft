import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/Tabs';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/Dialog';
import { Plus, Search, Edit, Trash2, Eye, Star, FileText, Calendar, Filter, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Review types and interfaces
interface ReviewCriteria {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  comments: string;
}

interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  reviewPeriod: string;
  submissionDate: string;
  status: 'draft' | 'submitted' | 'inReview' | 'completed';
  overallRating: number;
  criteria: ReviewCriteria[];
  strengths: string;
  areasForImprovement: string;
  goals: string;
  additionalComments: string;
}

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
}

const PerformanceReviewSystem: React.FC = () => {
  // States for application
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<PerformanceReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all-reviews');

  // New review form state
  const [newReview, setNewReview] = useState<Partial<PerformanceReview>>({
    employeeId: '',
    employeeName: '',
    reviewerId: '',
    reviewerName: '',
    reviewPeriod: '',
    status: 'draft',
    overallRating: 0,
    criteria: [],
    strengths: '',
    areasForImprovement: '',
    goals: '',
    additionalComments: ''
  });

  // Mock employees data
  const mockEmployees: Employee[] = [
    { id: '1', name: 'John Doe', department: 'Engineering', position: 'Senior Engineer' },
    { id: '2', name: 'Jane Smith', department: 'Sales', position: 'Sales Manager' },
    { id: '3', name: 'Robert Johnson', department: 'Marketing', position: 'Marketing Specialist' },
    { id: '4', name: 'Michael Brown', department: 'IT', position: 'IT Support' },
    { id: '5', name: 'Sarah Wilson', department: 'Human Resources', position: 'HR Coordinator' }
  ];

  // Mock performance review data
  const mockReviews: PerformanceReview[] = [
    {
      id: '1',
      employeeId: '1',
      employeeName: 'John Doe',
      reviewerId: '5',
      reviewerName: 'Sarah Wilson',
      reviewPeriod: '2023 Annual',
      submissionDate: '2023-12-15',
      status: 'completed',
      overallRating: 4.5,
      criteria: [
        { id: 'c1', name: 'Technical Skills', score: 4.7, maxScore: 5, comments: 'Excellent problem-solving skills and technical knowledge.' },
        { id: 'c2', name: 'Communication', score: 4.2, maxScore: 5, comments: 'Communicates clearly with team members and stakeholders.' },
        { id: 'c3', name: 'Teamwork', score: 4.5, maxScore: 5, comments: 'Works well in team settings and helps others when needed.' },
        { id: 'c4', name: 'Initiative', score: 4.6, maxScore: 5, comments: 'Takes initiative on projects and identifies improvement opportunities.' }
      ],
      strengths: 'Strong technical skills, excellent problem-solving abilities, and initiative in taking on new challenges.',
      areasForImprovement: 'Could benefit from more public speaking and presentation opportunities.',
      goals: 'Complete advanced certification in cloud architecture. Mentor junior team members.',
      additionalComments: 'John has been a valuable asset to the engineering team this year. His contributions to the core product have been significant.'
    },
    {
      id: '2',
      employeeId: '2',
      employeeName: 'Jane Smith',
      reviewerId: '5',
      reviewerName: 'Sarah Wilson',
      reviewPeriod: '2023 Annual',
      submissionDate: '2023-12-10',
      status: 'completed',
      overallRating: 4.8,
      criteria: [
        { id: 'c1', name: 'Leadership', score: 4.9, maxScore: 5, comments: 'Excellent team leadership and direction.' },
        { id: 'c2', name: 'Sales Performance', score: 4.8, maxScore: 5, comments: 'Consistently exceeds sales targets.' },
        { id: 'c3', name: 'Client Relationships', score: 4.7, maxScore: 5, comments: 'Builds strong, long-lasting client relationships.' },
        { id: 'c4', name: 'Strategic Planning', score: 4.7, maxScore: 5, comments: 'Develops effective sales strategies.' }
      ],
      strengths: 'Outstanding leadership, exceeds targets consistently, and builds strong client relationships.',
      areasForImprovement: 'Could improve on documentation and reporting.',
      goals: 'Develop new market strategy for next fiscal year. Implement improved CRM processes.',
      additionalComments: 'Jane has led the sales team to their best year on record. Her strategic vision has been instrumental to our success.'
    },
    {
      id: '3',
      employeeId: '3',
      employeeName: 'Robert Johnson',
      reviewerId: '5',
      reviewerName: 'Sarah Wilson',
      reviewPeriod: '2023 Annual',
      submissionDate: '2023-12-05',
      status: 'completed',
      overallRating: 3.9,
      criteria: [
        { id: 'c1', name: 'Marketing Creativity', score: 4.2, maxScore: 5, comments: 'Brings creative ideas to campaigns.' },
        { id: 'c2', name: 'Digital Marketing Skills', score: 3.8, maxScore: 5, comments: 'Good understanding of digital platforms.' },
        { id: 'c3', name: 'Project Management', score: 3.7, maxScore: 5, comments: 'Manages projects adequately but sometimes misses deadlines.' },
        { id: 'c4', name: 'Analytics', score: 3.9, maxScore: 5, comments: 'Able to interpret marketing data effectively.' }
      ],
      strengths: 'Creative campaign designs, good digital marketing knowledge.',
      areasForImprovement: 'Project management and meeting deadlines. Could benefit from additional training in analytics tools.',
      goals: 'Complete project management certification. Improve campaign ROI by 15%.',
      additionalComments: 'Robert has shown improvement this year. With focus on project management skills, he can become even more effective.'
    },
    {
      id: '4',
      employeeId: '4',
      employeeName: 'Michael Brown',
      reviewerId: '5',
      reviewerName: 'Sarah Wilson',
      reviewPeriod: '2023 Mid-Year',
      submissionDate: '2023-06-30',
      status: 'completed',
      overallRating: 4.0,
      criteria: [
        { id: 'c1', name: 'Technical Support Skills', score: 4.2, maxScore: 5, comments: 'Resolves issues efficiently.' },
        { id: 'c2', name: 'Customer Service', score: 4.1, maxScore: 5, comments: 'Good communication with users.' },
        { id: 'c3', name: 'Problem Solving', score: 3.9, maxScore: 5, comments: 'Addresses most problems effectively.' },
        { id: 'c4', name: 'Documentation', score: 3.8, maxScore: 5, comments: 'Documentation could be more detailed.' }
      ],
      strengths: 'Efficient troubleshooting, good customer service approach.',
      areasForImprovement: 'Documentation quality and consistency. Advanced technical skills for complex issues.',
      goals: 'Complete advanced networking certification. Improve ticket resolution time by 10%.',
      additionalComments: 'Michael has been reliable in supporting our team. With additional technical training, he can handle more complex issues.'
    },
    {
      id: '5',
      employeeId: '5',
      employeeName: 'Sarah Wilson',
      reviewerId: '1',
      reviewerName: 'John Doe',
      reviewPeriod: '2024 Q1',
      submissionDate: '2024-03-25',
      status: 'inReview',
      overallRating: 4.6,
      criteria: [
        { id: 'c1', name: 'HR Knowledge', score: 4.7, maxScore: 5, comments: 'Excellent understanding of HR policies and procedures.' },
        { id: 'c2', name: 'Employee Relations', score: 4.5, maxScore: 5, comments: 'Builds strong relationships with employees.' },
        { id: 'c3', name: 'Recruitment', score: 4.7, maxScore: 5, comments: 'Effective in sourcing and screening candidates.' },
        { id: 'c4', name: 'Compliance', score: 4.5, maxScore: 5, comments: 'Ensures company remains compliant with regulations.' }
      ],
      strengths: 'Strong HR knowledge, excellent employee relations, effective recruitment processes.',
      areasForImprovement: 'Could benefit from additional training in new HRIS systems.',
      goals: 'Implement new onboarding program. Complete SHRM certification.',
      additionalComments: 'Sarah has been instrumental in improving our HR processes this quarter. Her proactive approach to employee relations has improved morale.'
    },
    {
      id: '6',
      employeeId: '1',
      employeeName: 'John Doe',
      reviewerId: '5',
      reviewerName: 'Sarah Wilson',
      reviewPeriod: '2024 Q1',
      submissionDate: '2024-03-20',
      status: 'submitted',
      overallRating: 0,
      criteria: [
        { id: 'c1', name: 'Technical Skills', score: 0, maxScore: 5, comments: '' },
        { id: 'c2', name: 'Communication', score: 0, maxScore: 5, comments: '' },
        { id: 'c3', name: 'Teamwork', score: 0, maxScore: 5, comments: '' },
        { id: 'c4', name: 'Initiative', score: 0, maxScore: 5, comments: '' }
      ],
      strengths: '',
      areasForImprovement: '',
      goals: '',
      additionalComments: ''
    },
    {
      id: '7',
      employeeId: '2',
      employeeName: 'Jane Smith',
      reviewerId: '5',
      reviewerName: 'Sarah Wilson',
      reviewPeriod: '2024 Q1',
      submissionDate: '',
      status: 'draft',
      overallRating: 0,
      criteria: [
        { id: 'c1', name: 'Leadership', score: 0, maxScore: 5, comments: '' },
        { id: 'c2', name: 'Sales Performance', score: 0, maxScore: 5, comments: '' },
        { id: 'c3', name: 'Client Relationships', score: 0, maxScore: 5, comments: '' },
        { id: 'c4', name: 'Strategic Planning', score: 0, maxScore: 5, comments: '' }
      ],
      strengths: '',
      areasForImprovement: '',
      goals: '',
      additionalComments: ''
    }
  ];

  // Load mock data on component mount
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setReviews(mockReviews);
      setFilteredReviews(mockReviews);
      setLoading(false);
    }, 800);
  }, []);

  // Filter reviews based on search query and filters
  useEffect(() => {
    let results = reviews;
    
    // Filter by status
    if (filterStatus !== 'all') {
      results = results.filter(review => review.status === filterStatus);
    }
    
    // Filter by review period
    if (filterPeriod !== 'all') {
      results = results.filter(review => review.reviewPeriod.includes(filterPeriod));
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(review => 
        review.employeeName.toLowerCase().includes(query) ||
        review.reviewerName.toLowerCase().includes(query) ||
        review.reviewPeriod.toLowerCase().includes(query)
      );
    }
    
    // Filter by active tab
    if (activeTab === 'draft-reviews') {
      results = results.filter(review => review.status === 'draft');
    } else if (activeTab === 'pending-reviews') {
      results = results.filter(review => review.status === 'submitted' || review.status === 'inReview');
    } else if (activeTab === 'completed-reviews') {
      results = results.filter(review => review.status === 'completed');
    }
    
    setFilteredReviews(results);
  }, [reviews, searchQuery, filterStatus, filterPeriod, activeTab]);

  // Function to create a new review
  const handleCreateReview = () => {
    // Generate ID
    const newId = (reviews.length + 1).toString();
    
    // Prepare new review object
    const reviewToAdd: PerformanceReview = {
      id: newId,
      employeeId: newReview.employeeId || '',
      employeeName: newReview.employeeName || '',
      reviewerId: newReview.reviewerId || '',
      reviewerName: newReview.reviewerName || '',
      reviewPeriod: newReview.reviewPeriod || '',
      submissionDate: '',
      status: 'draft',
      overallRating: 0,
      criteria: [
        { id: 'c1', name: 'Job Knowledge', score: 0, maxScore: 5, comments: '' },
        { id: 'c2', name: 'Quality of Work', score: 0, maxScore: 5, comments: '' },
        { id: 'c3', name: 'Communication', score: 0, maxScore: 5, comments: '' },
        { id: 'c4', name: 'Teamwork', score: 0, maxScore: 5, comments: '' }
      ],
      strengths: '',
      areasForImprovement: '',
      goals: '',
      additionalComments: ''
    };
    
    // Add to reviews list
    setReviews([...reviews, reviewToAdd]);
    
    // Reset form and close modal
    setNewReview({
      employeeId: '',
      employeeName: '',
      reviewerId: '',
      reviewerName: '',
      reviewPeriod: '',
      status: 'draft',
      overallRating: 0,
      criteria: [],
      strengths: '',
      areasForImprovement: '',
      goals: '',
      additionalComments: ''
    });
    setIsCreateModalOpen(false);
    toast.success('Review created successfully');
  };

  // Function to render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-200 text-gray-800">Draft</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case 'inReview':
        return <Badge className="bg-yellow-100 text-yellow-800">In Review</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge className="bg-gray-200 text-gray-800">{status}</Badge>;
    }
  };

  // Function to render star rating
  const renderStarRating = (rating: number) => {
    // If rating is 0, show "Not Rated"
    if (rating === 0) {
      return <span className="text-gray-500 text-sm">Not Rated</span>;
    }
    
    // Otherwise show star rating
    return (
      <div className="flex items-center">
        <span className="text-yellow-500 mr-1">{rating.toFixed(1)}</span>
        <div className="flex">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              size={16}
              className={`${
                index < Math.floor(rating)
                  ? 'text-yellow-500 fill-yellow-500'
                  : index < rating
                  ? 'text-yellow-500 fill-yellow-500 opacity-50'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  // Function to delete a review
  const handleDeleteReview = () => {
    if (selectedReview) {
      // Filter out the review with the matching ID
      const updatedReviews = reviews.filter(review => review.id !== selectedReview.id);
      setReviews(updatedReviews);
      setFilteredReviews(updatedReviews);
      setSelectedReview(null);
      setIsDeleteModalOpen(false);
      toast.success('Review deleted successfully');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Performance Review System</h1>
      <p className="text-gray-600">Manage employee performance reviews, evaluations, and feedback</p>
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search reviews..."
            className="pl-10 w-full md:w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="w-full sm:w-48">
            <SelectRoot value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Filter size={16} />
                  <SelectValue placeholder="Filter by status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="inReview">In Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </SelectRoot>
          </div>
          
          <div className="w-full sm:w-48">
            <SelectRoot value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <SelectValue placeholder="Filter by period" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="Annual">Annual</SelectItem>
                <SelectItem value="Q1">Q1</SelectItem>
                <SelectItem value="Mid-Year">Mid-Year</SelectItem>
              </SelectContent>
            </SelectRoot>
          </div>
          
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
            <Plus size={16} className="mr-2" />
            Create Review
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <Tabs defaultValue="all-reviews" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="all-reviews">All Reviews</TabsTrigger>
          <TabsTrigger value="draft-reviews">Drafts</TabsTrigger>
          <TabsTrigger value="pending-reviews">Pending</TabsTrigger>
          <TabsTrigger value="completed-reviews">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all-reviews" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-4 text-gray-500">Loading reviews...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center h-64">
                  <FileText size={48} className="text-gray-300" />
                  <p className="mt-4 text-gray-500">No reviews found</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={16} className="mr-2" />
                    Create New Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredReviews.map((review) => (
                <Card key={review.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{review.employeeName}</h3>
                          <p className="text-sm text-gray-500">{review.reviewPeriod} Review</p>
                        </div>
                        <div className="flex gap-2 mt-2 md:mt-0">
                          {renderStatusBadge(review.status)}
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedReview(review);
                            setIsViewModalOpen(true);
                          }}>
                            <Eye size={16} className="mr-1" />
                            View
                          </Button>
                          
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedReview(review);
                            setIsEditModalOpen(true);
                          }}>
                            <Edit size={16} className="mr-1" />
                            Edit
                          </Button>
                          
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedReview(review);
                            setIsDeleteModalOpen(true);
                          }}>
                            <Trash2 size={16} className="mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Reviewer</p>
                          <p className="text-sm font-medium">{review.reviewerName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Submission Date</p>
                          <p className="text-sm font-medium">
                            {review.submissionDate ? new Date(review.submissionDate).toLocaleDateString() : 'Not submitted'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Overall Rating</p>
                          <div className="text-sm font-medium">
                            {renderStarRating(review.overallRating)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="draft-reviews" className="space-y-4">
          {/* Same content as all-reviews tab but filtered for drafts */}
          {/* This filtering is handled in the useEffect */}
        </TabsContent>
        
        <TabsContent value="pending-reviews" className="space-y-4">
          {/* Same content as all-reviews tab but filtered for pending */}
          {/* This filtering is handled in the useEffect */}
        </TabsContent>
        
        <TabsContent value="completed-reviews" className="space-y-4">
          {/* Same content as all-reviews tab but filtered for completed */}
          {/* This filtering is handled in the useEffect */}
        </TabsContent>
      </Tabs>

      {/* View Review Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Performance Review Details</DialogTitle>
            <DialogDescription>
              View complete performance review information
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <ScrollArea className="max-h-[70vh]">
              <div className="p-4 space-y-6">
                {/* Review Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedReview.employeeName}</h3>
                    <p className="text-sm text-gray-500">{selectedReview.reviewPeriod} Review</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStatusBadge(selectedReview.status)}
                    {selectedReview.status === 'completed' && (
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Overall:</span>
                        {renderStarRating(selectedReview.overallRating)}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Review Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Review Information</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <p className="text-sm text-gray-500">Employee:</p>
                        <p className="text-sm font-medium">{selectedReview.employeeName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <p className="text-sm text-gray-500">Reviewer:</p>
                        <p className="text-sm font-medium">{selectedReview.reviewerName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <p className="text-sm text-gray-500">Review Period:</p>
                        <p className="text-sm font-medium">{selectedReview.reviewPeriod}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <p className="text-sm text-gray-500">Submission Date:</p>
                        <p className="text-sm font-medium">
                          {selectedReview.submissionDate 
                            ? new Date(selectedReview.submissionDate).toLocaleDateString() 
                            : 'Not submitted'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <p className="text-sm text-gray-500">Status:</p>
                        <p className="text-sm">{renderStatusBadge(selectedReview.status)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {selectedReview.status === 'completed' && (
                    <div>
                      <h4 className="font-medium mb-2">Performance Summary</h4>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <p className="text-sm text-gray-500">Overall Rating:</p>
                          <p className="text-sm font-medium">{renderStarRating(selectedReview.overallRating)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Performance Criteria */}
                {selectedReview.status === 'completed' && (
                  <div>
                    <h4 className="font-medium mb-2">Performance Criteria</h4>
                    <div className="space-y-4">
                      {selectedReview.criteria.map((criterion) => (
                        <div key={criterion.id} className="p-4 border rounded-md">
                          <div className="flex justify-between items-center">
                            <h5 className="font-medium">{criterion.name}</h5>
                            <div className="flex items-center">
                              <span className="text-sm font-medium mr-2">
                                {criterion.score.toFixed(1)}/{criterion.maxScore}
                              </span>
                              {renderStarRating(criterion.score)}
                            </div>
                          </div>
                          {criterion.comments && (
                            <p className="text-sm mt-2">{criterion.comments}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Strengths & Areas for Improvement */}
                {selectedReview.status === 'completed' && selectedReview.strengths && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Strengths</h4>
                      <p className="text-sm">{selectedReview.strengths}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Areas for Improvement</h4>
                      <p className="text-sm">{selectedReview.areasForImprovement}</p>
                    </div>
                  </div>
                )}
                
                {/* Goals */}
                {selectedReview.status === 'completed' && selectedReview.goals && (
                  <div>
                    <h4 className="font-medium mb-2">Development Goals</h4>
                    <p className="text-sm">{selectedReview.goals}</p>
                  </div>
                )}
                
                {/* Additional Comments */}
                {selectedReview.status === 'completed' && selectedReview.additionalComments && (
                  <div>
                    <h4 className="font-medium mb-2">Additional Comments</h4>
                    <p className="text-sm">{selectedReview.additionalComments}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            {selectedReview && selectedReview.status !== 'draft' && (
              <Button onClick={() => {
                // Logic to print or download review
                toast.success('Review downloaded');
              }}>
                Download Review
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Review Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Performance Review</DialogTitle>
            <DialogDescription>
              Create a new performance review for an employee
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="employeeName">Employee</Label>
              <SelectRoot 
                value={newReview.employeeId} 
                onValueChange={(value) => {
                  const employee = mockEmployees.find(e => e.id === value);
                  setNewReview({
                    ...newReview,
                    employeeId: value,
                    employeeName: employee ? employee.name : ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {mockEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} - {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reviewerName">Reviewer</Label>
              <SelectRoot 
                value={newReview.reviewerId} 
                onValueChange={(value) => {
                  const reviewer = mockEmployees.find(e => e.id === value);
                  setNewReview({
                    ...newReview,
                    reviewerId: value,
                    reviewerName: reviewer ? reviewer.name : ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {mockEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} - {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reviewPeriod">Review Period</Label>
              <SelectRoot 
                value={newReview.reviewPeriod} 
                onValueChange={(value) => {
                  setNewReview({
                    ...newReview,
                    reviewPeriod: value
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select review period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024 Q1">2024 Q1</SelectItem>
                  <SelectItem value="2024 Q2">2024 Q2</SelectItem>
                  <SelectItem value="2024 Mid-Year">2024 Mid-Year</SelectItem>
                  <SelectItem value="2024 Q3">2024 Q3</SelectItem>
                  <SelectItem value="2024 Q4">2024 Q4</SelectItem>
                  <SelectItem value="2024 Annual">2024 Annual</SelectItem>
                </SelectContent>
              </SelectRoot>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateReview}
              disabled={!newReview.employeeId || !newReview.reviewerId || !newReview.reviewPeriod}
            >
              Create Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Review Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Performance Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <div className="py-4">
              <div className="p-4 border rounded-md space-y-2">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{selectedReview.employeeName}</p>
                    <p className="text-sm text-gray-500">{selectedReview.reviewPeriod} Review</p>
                  </div>
                  <div>{renderStatusBadge(selectedReview.status)}</div>
                </div>
                <p className="text-sm">
                  <span className="text-gray-500">Reviewer:</span> {selectedReview.reviewerName}
                </p>
                {selectedReview.submissionDate && (
                  <p className="text-sm">
                    <span className="text-gray-500">Submitted:</span> {new Date(selectedReview.submissionDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteReview}>
              Delete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerformanceReviewSystem; 