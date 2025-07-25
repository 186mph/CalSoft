import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { 
  Card, Button, Input, Select, Badge, 
  Textarea, toast 
} from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Calendar, Filter, Loader2 } from 'lucide-react';
import engineeringService from '@/lib/services/engineeringService';
import type { DesignMetrics } from '@/lib/services/engineeringService';

export type DesignStatus = 'draft' | 'submitted' | 'in-review' | 'approved' | 'rejected' | 'archived';

export interface DesignFilters {
  status?: DesignStatus;
  project?: string;
  designType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface DesignDocument {
  id: string;
  title: string;
  description: string;
  design_type: string;
  project: string;
  version: string;
  status: DesignStatus;
  file_url: string;
  created_at: string;
  submitted_by: {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
  };
  submitted_by_id: string;
  submitted_at?: string;
  reviewed_by?: {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
  };
  reviewed_by_id?: string;
  reviewed_at?: string;
  review_comments?: string;
}

interface DesignApprovalWorkflowProps {
  refreshTrigger?: number;
}

export function DesignApprovalWorkflow({ refreshTrigger = 0 }: DesignApprovalWorkflowProps) {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<DesignDocument[]>([]);
  const [filteredDesigns, setFilteredDesigns] = useState<DesignDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<DesignMetrics>({
    total: 0,
    draft: 0,
    submitted: 0,
    inReview: 0,
    approved: 0,
    rejected: 0,
    archived: 0
  });
  
  // Filter states
  const [filters, setFilters] = useState<DesignFilters>({});
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [designTypes, setDesignTypes] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  
  // Review dialog states
  const [reviewDialog, setReviewDialog] = useState<boolean>(false);
  const [selectedDesign, setSelectedDesign] = useState<DesignDocument | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'in-review' | 'approved' | 'rejected'>('in-review');
  const [reviewComments, setReviewComments] = useState<string>('');
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchDesigns();
    fetchMetrics();
    fetchFiltersOptions();
  }, [refreshTrigger]);

  useEffect(() => {
    filterDesigns();
  }, [designs, filters]);

  const fetchDesigns = async () => {
    setLoading(true);
    const response = await engineeringService.getDesigns(filters);
    if (response.data) {
      setDesigns(response.data);
    } else {
      toast({
        title: 'Error',
        description: response.error ? String(response.error) : 'Failed to fetch designs',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const fetchMetrics = async () => {
    const response = await engineeringService.getDesignMetrics();
    if (response.data) {
      setMetrics(response.data);
    }
  };

  const fetchFiltersOptions = async () => {
    // Fetch design types
    const typesResponse = await engineeringService.getDesignTypes();
    if (typesResponse.data) {
      setDesignTypes(typesResponse.data);
    }

    // Fetch projects
    const projectsResponse = await engineeringService.getProjects();
    if (projectsResponse.data) {
      setProjects(projectsResponse.data);
    }
  };

  const filterDesigns = () => {
    let filtered = [...designs];
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(design => 
        design.title.toLowerCase().includes(searchLower) ||
        design.description.toLowerCase().includes(searchLower)
      );
    }
    setFilteredDesigns(filtered);
  };

  const handleFilterChange = (key: keyof DesignFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const applyFilters = () => {
    setShowFilters(false);
    fetchDesigns();
  };

  const openReviewDialog = (design: DesignDocument) => {
    setSelectedDesign(design);
    setReviewStatus('in-review');
    setReviewComments('');
    setReviewDialog(true);
  };

  const handleReview = async () => {
    if (!selectedDesign || !user) return;
    
    setReviewLoading(true);
    const response = await engineeringService.reviewDesign({
      design_id: selectedDesign.id,
      status: reviewStatus,
      comments: reviewComments,
      reviewer_id: user.id
    });
    
    setReviewLoading(false);
    
    if (response.error) {
      toast({
        title: 'Error',
        description: response.error ? String(response.error) : 'Failed to review design',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'Success',
      description: `Design ${reviewStatus === 'approved' ? 'approved' : reviewStatus === 'rejected' ? 'rejected' : 'moved to review'}`,
      variant: 'success',
    });
    
    setReviewDialog(false);
    fetchDesigns();
    fetchMetrics();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeVariant = (status: DesignStatus) => {
    switch (status) {
      case 'draft': return 'outline';
      case 'submitted': return 'default';
      case 'in-review': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 mb-6">
        <Card className="w-full md:w-auto px-4 py-3 flex items-center gap-3">
          <div className="text-sm font-medium">All</div>
          <div className="text-2xl font-bold">{metrics.total}</div>
        </Card>
        <Card className="w-full md:w-auto px-4 py-3 flex items-center gap-3">
          <div className="text-sm font-medium">Submitted</div>
          <div className="text-2xl font-bold">{metrics.submitted}</div>
        </Card>
        <Card className="w-full md:w-auto px-4 py-3 flex items-center gap-3">
          <div className="text-sm font-medium">In Review</div>
          <div className="text-2xl font-bold">{metrics.inReview}</div>
        </Card>
        <Card className="w-full md:w-auto px-4 py-3 flex items-center gap-3">
          <div className="text-sm font-medium">Approved</div>
          <div className="text-2xl font-bold">{metrics.approved}</div>
        </Card>
        <Card className="w-full md:w-auto px-4 py-3 flex items-center gap-3">
          <div className="text-sm font-medium">Rejected</div>
          <div className="text-2xl font-bold">{metrics.rejected}</div>
        </Card>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search designs..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDesigns()}
          />
        </div>
        <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <Select
                label="Status"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value as DesignStatus)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'submitted', label: 'Submitted' },
                  { value: 'in-review', label: 'In Review' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'archived', label: 'Archived' }
                ]}
              />
            </div>
            <div>
              <Select
                label="Design Type"
                value={filters.designType || ''}
                onChange={(e) => handleFilterChange('designType', e.target.value)}
                options={[
                  { value: '', label: 'All Types' },
                  ...designTypes.map(type => ({ value: type, label: type }))
                ]}
              />
            </div>
            <div>
              <Select
                label="Project"
                value={filters.project || ''}
                onChange={(e) => handleFilterChange('project', e.target.value)}
                options={[
                  { value: '', label: 'All Projects' },
                  ...projects.map(project => ({ value: project, label: project }))
                ]}
              />
            </div>
            <div>
              <Input
                type="date"
                label="From Date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <Input
                type="date"
                label="To Date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading designs...</p>
          </div>
        </Card>
      ) : filteredDesigns.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No designs found matching your criteria.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => { clearFilters(); fetchDesigns(); }}
          >
            Clear Filters & Reload
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDesigns.map((design) => (
            <Card key={design.id} className="p-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium">{design.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{design.project}</span>
                        <span>•</span>
                        <span>{design.design_type}</span>
                        <span>•</span>
                        <span>v{design.version}</span>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(design.status) as any}>
                      {design.status.charAt(0).toUpperCase() + design.status.slice(1).replace('-', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm">{design.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 mt-4 text-sm">
                    <div>
                      <span className="font-medium">Submitted by:</span>{' '}
                      {design.submitted_by?.display_name || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Submitted on:</span>{' '}
                      {formatDate(design.submitted_at || design.created_at)}
                    </div>
                    {design.reviewed_by && (
                      <>
                        <div>
                          <span className="font-medium">Reviewed by:</span>{' '}
                          {design.reviewed_by?.display_name}
                        </div>
                        <div>
                          <span className="font-medium">Reviewed on:</span>{' '}
                          {formatDate(design.reviewed_at)}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {design.review_comments && (
                    <div className="mt-2">
                      <span className="font-medium text-sm">Review comments:</span>
                      <p className="text-sm mt-1 p-2 bg-muted rounded-md">{design.review_comments}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-row md:flex-col gap-2 justify-end">
                  <Button variant="outline" size="sm">
                    <a href={design.file_url} target="_blank" rel="noopener noreferrer">
                      View Design
                    </a>
                  </Button>
                  
                  {['submitted', 'in-review'].includes(design.status) && (
                    <Button 
                      onClick={() => openReviewDialog(design)} 
                      variant="primary" 
                      size="sm"
                    >
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Design</DialogTitle>
          </DialogHeader>
          {selectedDesign && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{selectedDesign.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedDesign.description}</p>
              </div>
              
              <div className="space-y-2">
                <div className="font-medium">Review Status</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={reviewStatus === 'in-review' ? 'primary' : 'outline'}
                    onClick={() => setReviewStatus('in-review')}
                  >
                    Mark as In Review
                  </Button>
                  <Button
                    size="sm"
                    variant={reviewStatus === 'approved' ? 'primary' : 'outline'}
                    onClick={() => setReviewStatus('approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant={reviewStatus === 'rejected' ? 'primary' : 'outline'}
                    onClick={() => setReviewStatus('rejected')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
              
              <Textarea
                label="Review Comments"
                placeholder="Enter your review comments..."
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
              />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setReviewDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReview}
                  disabled={reviewLoading}
                >
                  {reviewLoading ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 