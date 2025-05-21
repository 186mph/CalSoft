import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { reportService, TechnicalReport, ReportStatus, ReportFilters } from '@/lib/services/reportService';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/toast';
import { 
  ClipboardCheck, 
  FilePlus, 
  FileCheck, 
  FileX, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  RotateCw,
  Eye,
  Download,
  Clock1,
  History,
  UserCheck
} from 'lucide-react';
import Select from '@/components/ui/Select';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ReportApprovalWorkflowProps {
  division?: string;
  jobId?: string;
}

export function ReportApprovalWorkflow({ division, jobId }: ReportApprovalWorkflowProps) {
  const { user } = useAuth();
  const [reports, setReports] = useState<TechnicalReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<TechnicalReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('pending');
  
  // Filter and search state
  const [filters, setFilters] = useState<ReportFilters>({
    status: 'submitted',
    job_id: jobId
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start?: string, end?: string }>({});

  // Review dialog state
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'in-review'>('in-review');
  
  // View report dialog state
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Metrics state
  const [metrics, setMetrics] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    inReview: 0,
    approved: 0,
    rejected: 0,
    archived: 0
  });

  // Role-based access control
  const [userRole, setUserRole] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<{
    canView: boolean;
    canReview: boolean;
    canApprove: boolean;
    canExport: boolean;
  }>({
    canView: false,
    canReview: false,
    canApprove: false,
    canExport: false
  });

  // When jobId changes, update filters
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      job_id: jobId
    }));
  }, [jobId]);

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchReports();
    fetchMetrics();
    if (user?.user_metadata?.role) {
      const role = user.user_metadata.role as string;
      setUserRole(role);
      
      // Set permissions based on role
      setUserPermissions({
        canView: true, // All authenticated users can view
        canReview: ['Manager', 'Admin', 'Supervisor'].includes(role),
        canApprove: ['Manager', 'Admin'].includes(role),
        canExport: ['Manager', 'Admin', 'Supervisor', 'User'].includes(role)
      });
    }
  }, [activeTab, filters, jobId, user]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      // Map activeTab to status filter
      let statusFilter: ReportStatus | undefined;
      switch (activeTab) {
        case 'pending':
          statusFilter = 'submitted';
          break;
        case 'in-review':
          statusFilter = 'in-review';
          break;
        case 'approved':
          statusFilter = 'approved';
          break;
        case 'rejected':
          statusFilter = 'rejected';
          break;
        case 'archived':
          statusFilter = 'archived';
          break;
        default:
          statusFilter = undefined;
      }

      // Build filters object
      const queryFilters: ReportFilters = {
        ...filters,
        status: statusFilter,
        start_date: dateRange.start,
        end_date: dateRange.end,
        search: searchTerm,
        report_type: reportTypeFilter || undefined,
        job_id: jobId // Ensure job_id is set from props
      };

      const response = await reportService.getAllReports(queryFilters);
      
      if (response.error) {
        setError(`Failed to load reports: ${response.error && typeof response.error === 'object' ? (response.error as any).message || 'Unknown error' : 'Unknown error'}`);
      } else {
        setReports(response.data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('An unexpected error occurred while fetching reports.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      let response;
      if (jobId) {
        // For job-specific metrics, we need to modify our API call
        // Since the original function doesn't support job_id filtering directly
        const allReportsResponse = await reportService.getAllReports({ job_id: jobId });
        if (allReportsResponse.data) {
          // Calculate metrics manually from the filtered reports
          const reports = allReportsResponse.data;
          const metricCounts = {
            total: reports.length,
            draft: reports.filter(r => r.status === 'draft').length,
            submitted: reports.filter(r => r.status === 'submitted').length,
            inReview: reports.filter(r => r.status === 'in-review').length,
            approved: reports.filter(r => r.status === 'approved').length,
            rejected: reports.filter(r => r.status === 'rejected').length,
            archived: reports.filter(r => r.status === 'archived').length
          };
          setMetrics(metricCounts);
          return;
        }
      }
      
      // If no jobId or there was an error, get global metrics
      response = await reportService.getReportApprovalMetrics();
      
      if (response.error) {
        console.error('Error fetching metrics:', response.error);
      } else {
        setMetrics(response.data);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  };

  const handleReviewReport = (report: TechnicalReport) => {
    setSelectedReport(report);
    setReviewComments('');
    setReviewStatus('in-review');
    setShowReviewDialog(true);
  };

  const handleViewReport = (report: TechnicalReport) => {
    setSelectedReport(report);
    setShowViewDialog(true);
  };

  const submitReview = async () => {
    if (!selectedReport || !user) return;
    
    setIsLoading(true);
    try {
      const response = await reportService.reviewReport({
        report_id: selectedReport.id,
        status: reviewStatus,
        comments: reviewComments,
        reviewer_id: user.id
      });
      
      if (response.error) {
        toast({
          title: "Error",
          description: `Failed to submit review: ${response.error && typeof response.error === 'object' ? (response.error as any).message || 'Unknown error' : 'Unknown error'}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: `Report ${reviewStatus === 'approved' ? 'approved' : reviewStatus === 'rejected' ? 'rejected' : 'marked for review'}`,
          variant: "success"
        });
        setShowReviewDialog(false);
        fetchReports();
        fetchMetrics();
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchReports();
    fetchMetrics();
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'submitted':
        return <Badge variant="default">Pending</Badge>;
      case 'in-review':
        return <Badge variant="secondary">In Review</Badge>;
      case 'approved':
        return <Badge variant="secondary">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isManager = user?.user_metadata?.role === 'Manager' || user?.user_metadata?.role === 'Admin';

  // Generate PDF report
  const generatePDF = (report: TechnicalReport) => {
    try {
      const doc = new jsPDF();
      
      // Add header with logo (would need to import logo)
      // doc.addImage(logo, 'PNG', 10, 10, 50, 15);
      
      // Add title
      doc.setFontSize(20);
      doc.text('Technical Report', 105, 20, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text(report.title, 105, 30, { align: 'center' });
      
      // Add metadata
      doc.setFontSize(12);
      doc.text(`Report ID: ${report.id}`, 14, 45);
      doc.text(`Type: ${report.report_type}`, 14, 55);
      doc.text(`Status: ${report.status.toUpperCase()}`, 14, 65);
      doc.text(`Submitted: ${formatDate(report.submitted_at)}`, 14, 75);
      
      if (report.reviewed_at && report.reviewed_by) {
        doc.text(`Reviewed: ${formatDate(report.reviewed_at)}`, 14, 85);
        doc.text(`Reviewer: ${typeof report.reviewed_by === 'object' ? 
          (report.reviewed_by as any)?.display_name || 'Unknown' : 'Unknown'}`, 14, 95);
      }
      
      // Add revision history
      doc.setFontSize(14);
      doc.text('Revision History', 14, 115);
      
      const revisionData = report.revision_history.map(rev => [
        `v${rev.version}`,
        rev.status,
        formatDate(rev.timestamp),
        rev.user_name || 'Unknown'
      ]);
      
      (doc as any).autoTable({
        startY: 120,
        head: [['Version', 'Status', 'Date', 'User']],
        body: revisionData,
      });
      
      // Add report data
      const reportDataY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.text('Report Details', 14, reportDataY);
      
      // Format report data as needed
      let reportTextY = reportDataY + 10;
      const reportDataStr = JSON.stringify(report.report_data, null, 2);
      const reportLines = reportDataStr.split('\n');
      
      doc.setFontSize(10);
      reportLines.forEach((line, index) => {
        if (reportTextY > 280) {
          doc.addPage();
          reportTextY = 20;
        }
        doc.text(line, 14, reportTextY);
        reportTextY += 5;
      });
      
      // Add approval signature for approved reports
      if (report.status === 'approved') {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Approval Certification', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text('This report has been reviewed and approved according to', 105, 40, { align: 'center' });
        doc.text('company standards and procedures.', 105, 50, { align: 'center' });
        
        doc.text(`Approved by: ${typeof report.reviewed_by === 'object' ? 
          (report.reviewed_by as any)?.display_name || 'Unknown' : 'Unknown'}`, 105, 70, { align: 'center' });
        doc.text(`Approval date: ${formatDate(report.reviewed_at)}`, 105, 80, { align: 'center' });
        
        // Add signature line
        doc.line(60, 100, 150, 100);
        doc.text('Authorized Signature', 105, 110, { align: 'center' });
      }
      
      // Save the PDF
      doc.save(`Report_${report.id}_${report.title.replace(/\s+/g, '_')}.pdf`);
      
      toast({
        title: "Success",
        description: "Report PDF has been generated and downloaded",
        variant: "success"
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive"
      });
    }
  };

  // Customize the UI based on whether we're showing all reports or just job-specific reports
  const isJobSpecific = !!jobId;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {isJobSpecific ? "Job Report Approval" : "Technical Report Approval Workflow"}
        </h2>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RotateCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Metrics Summary Cards - Only show if not job-specific */}
      {!isJobSpecific && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {metrics.submitted}
                <span className="text-sm text-gray-500 font-normal ml-2">
                  reports
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.inReview}
                <span className="text-sm text-gray-500 font-normal ml-2">
                  reports
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.approved}
                <span className="text-sm text-gray-500 font-normal ml-2">
                  reports
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.rejected}
                <span className="text-sm text-gray-500 font-normal ml-2">
                  reports
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`flex ${isJobSpecific ? 'flex-col sm:flex-row' : 'flex-col md:flex-row'} gap-4 mb-4`}>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {!isJobSpecific && (
              <div className="w-full md:w-48">
                <Select
                  value={reportTypeFilter}
                  onChange={(e) => setReportTypeFilter(e.target.value)}
                  className="w-full"
                  options={[
                    { label: 'All Report Types', value: '' },
                    { label: 'Transformer Test', value: 'transformer-test' },
                    { label: 'Cable Test', value: 'cable-test' },
                    { label: 'Switchgear Test', value: 'switchgear-test' },
                    { label: 'Inspection Report', value: 'inspection' }
                  ]}
                />
              </div>
            )}
            
            {!isJobSpecific && (
              <div className="flex space-x-2">
                <div>
                  <Input
                    type="date"
                    value={dateRange.start || ''}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="w-full"
                    placeholder="Start Date"
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    value={dateRange.end || ''}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="w-full"
                    placeholder="End Date"
                  />
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button 
                onClick={fetchReports}
                variant="secondary"
              >
                Apply Filters
              </Button>
              
              {isJobSpecific && userPermissions.canView && (
                <Button 
                  variant="primary"
                  className="gap-2"
                  onClick={() => {
                    // This would be replaced with actual navigation logic to the report creation page
                    // with the job ID pre-selected
                    window.location.href = `/reports/create?job_id=${jobId}`;
                  }}
                >
                  <FilePlus className="h-4 w-4" />
                  Create Report
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for report status filter */}
      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="mr-2 h-4 w-4" />
            Pending Approval
          </TabsTrigger>
          <TabsTrigger value="in-review">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            In Review
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="mr-2 h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="mr-2 h-4 w-4" />
            Rejected
          </TabsTrigger>
          <TabsTrigger value="archived">
            <FileCheck className="mr-2 h-4 w-4" />
            Archived
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-10">
              <p>Loading reports...</p>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-10 border rounded-md">
              <FileCheck className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
              <p className="mt-1 text-sm text-gray-500">
                There are no reports with the current filter criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{report.title}</h3>
                        <p className="text-sm text-gray-500">
                          Report Type: {report.report_type}
                        </p>
                        <div className="mt-2 flex items-center space-x-2">
                          {getStatusBadge(report.status)}
                          <span className="text-sm text-gray-500">
                            Submitted: {formatDate(report.submitted_at)}
                          </span>
                        </div>
                        {report.reviewed_at && (
                          <div className="mt-1 text-sm text-gray-500">
                            Reviewed: {formatDate(report.reviewed_at)} by {typeof report.reviewed_by === 'object' ? (report.reviewed_by as any)?.display_name || 'Unknown' : 'Unknown'}
                          </div>
                        )}
                        {report.review_comments && (
                          <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50">
                            <p className="text-sm text-gray-700">{report.review_comments}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        
                        {isManager && report.status === 'submitted' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReviewReport(report)}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            Review
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

      {/* Review Dialog */}
      {selectedReport && (
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Report: {selectedReport.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">Report Status</h4>
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant={reviewStatus === 'in-review' ? 'secondary' : 'outline'}
                      onClick={() => setReviewStatus('in-review')}
                      className="flex-1"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      In Review
                    </Button>
                    <Button 
                      type="button" 
                      variant={reviewStatus === 'approved' ? 'secondary' : 'outline'}
                      onClick={() => setReviewStatus('approved')}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      type="button" 
                      variant={reviewStatus === 'rejected' ? 'secondary' : 'outline'}
                      onClick={() => setReviewStatus('rejected')}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">Review Comments</h4>
                  <Textarea
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder={reviewStatus === 'rejected' ? 'Explanation for rejection is required...' : 'Add comments about this report...'}
                    rows={4}
                    required={reviewStatus === 'rejected'}
                  />
                  {reviewStatus === 'rejected' && !reviewComments && (
                    <p className="text-sm text-red-500 mt-1">Comments are required when rejecting a report</p>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowReviewDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={submitReview}
                    disabled={isLoading || (reviewStatus === 'rejected' && !reviewComments)}
                  >
                    Submit Review
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Report Dialog */}
      {selectedReport && (
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedReport.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Report Type</h4>
                  <p>{selectedReport.report_type}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <div>{getStatusBadge(selectedReport.status)}</div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Submitted By</h4>
                  <p>{typeof selectedReport.submitted_by === 'object' ? (selectedReport.submitted_by as any)?.display_name || 'Unknown' : 'Unknown'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Submitted Date</h4>
                  <p>{formatDate(selectedReport.submitted_at)}</p>
                </div>
                {selectedReport.reviewed_by && (
                  <>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Reviewed By</h4>
                      <p>{typeof selectedReport.reviewed_by === 'object' ? (selectedReport.reviewed_by as any)?.display_name || 'Unknown' : 'Unknown'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Review Date</h4>
                      <p>{formatDate(selectedReport.reviewed_at)}</p>
                    </div>
                  </>
                )}
              </div>

              {selectedReport.review_comments && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Review Comments</h4>
                  <div className="p-3 border rounded bg-gray-50">
                    {selectedReport.review_comments}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-1">Revision History</h4>
                <div className="border rounded divide-y">
                  {selectedReport.revision_history.map((revision, index) => (
                    <div key={index} className="p-3 flex justify-between">
                      <div className="flex items-center">
                        <History className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">Version {revision.version}: </span>
                        <Badge variant="outline" className="ml-2">
                          {revision.status}
                        </Badge>
                        {revision.comments && (
                          <span className="ml-3 text-sm text-gray-600">
                            {revision.comments}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock1 className="h-3 w-3 mr-1" />
                        {formatDate(revision.timestamp)}
                        {revision.user_name && (
                          <span className="ml-3 flex items-center">
                            <UserCheck className="h-3 w-3 mr-1" />
                            {revision.user_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Report Content Preview</h4>
                <div className="border rounded p-4 max-h-96 overflow-auto">
                  <p className="text-gray-500 italic">This is a summary view. To see the full report, please open the report in its respective viewer.</p>
                  <pre className="mt-2 text-xs whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(selectedReport.report_data, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                {userPermissions.canExport && selectedReport.status === 'approved' && (
                  <Button 
                    onClick={() => generatePDF(selectedReport)}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                )}
                <Button 
                  onClick={() => setShowViewDialog(false)}
                  variant="secondary"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 