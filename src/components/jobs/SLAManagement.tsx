import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { AlertCircle, CheckCircle, Clock, AlertTriangle, Plus, RefreshCw, FileText } from 'lucide-react';
import { Label } from '@/components/ui/Label';
import Input from '@/components/ui/Input';
import { SelectRoot as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDistanceToNow, formatRelative, format } from 'date-fns';
import toast from '@/components/ui/toast';

import {
  SLADefinition,
  SLATracking,
  SLAViolation,
  SLAComplianceStatus,
  SLAPriority,
  SLAMetricType,
  SLATimePeriod,
  getSLADefinitions,
  getSLATrackingForJob,
  getSLAViolationsForJob,
  applySLAToJob,
  checkAndUpdateSLACompliance,
  completeSLATracking,
  acknowledgeSLAViolation,
  getSLAPerformanceSummary
} from '@/services/slaService';

// Helper functions for formatting
const formatSLAStatus = (status: SLAComplianceStatus) => {
  switch (status) {
    case 'compliant':
      return { label: 'Compliant', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-4 w-4" /> };
    case 'at_risk':
      return { label: 'At Risk', color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="h-4 w-4" /> };
    case 'violated':
      return { label: 'Violated', color: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-4 w-4" /> };
    default:
      return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-4 w-4" /> };
  }
};

const formatPriority = (priority: SLAPriority) => {
  switch (priority) {
    case 'low':
      return { label: 'Low', color: 'bg-blue-100 text-blue-800' };
    case 'medium':
      return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    case 'high':
      return { label: 'High', color: 'bg-orange-100 text-orange-800' };
    case 'critical':
      return { label: 'Critical', color: 'bg-red-100 text-red-800' };
    default:
      return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }
};

const formatMetricType = (type: SLAMetricType) => {
  switch (type) {
    case 'response_time':
      return 'Response Time';
    case 'resolution_time':
      return 'Resolution Time';
    case 'uptime_percentage':
      return 'Uptime Percentage';
    case 'custom':
      return 'Custom Metric';
    default:
      return 'Unknown';
  }
};

const formatTimePeriod = (value: number, period: SLATimePeriod) => {
  if (value === 1) {
    return `1 ${period.slice(0, -1)}`; // Remove trailing 's'
  } else {
    return `${value} ${period}`;
  }
};

interface SLAManagementProps {
  jobId: string;
  jobDetails?: any; // Optional job details if available
}

export function SLAManagement({ jobId, jobDetails }: SLAManagementProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [slaDefinitions, setSLADefinitions] = useState<SLADefinition[]>([]);
  const [slaTracking, setSLATracking] = useState<SLATracking[]>([]);
  const [slaViolations, setSLAViolations] = useState<SLAViolation[]>([]);
  const [showAddSLADialog, setShowAddSLADialog] = useState(false);
  const [selectedSLA, setSelectedSLA] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('active');

  // Fetch SLA data
  useEffect(() => {
    const fetchSLAData = async () => {
      setIsLoading(true);
      try {
        // Get SLA definitions (active ones)
        const definitions = await getSLADefinitions('active');
        setSLADefinitions(definitions);
        
        // Get SLA tracking for this job
        const tracking = await getSLATrackingForJob(jobId);
        setSLATracking(tracking);
        
        // Get SLA violations for this job
        const violations = await getSLAViolationsForJob(jobId);
        setSLAViolations(violations);
      } catch (error) {
        console.error('Error fetching SLA data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load SLA data. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSLAData();
  }, [jobId, refreshTrigger]);

  // Add SLA to job
  const handleAddSLA = async () => {
    if (!selectedSLA) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select an SLA to add.'
      });
      return;
    }
    
    try {
      const result = await applySLAToJob(jobId, selectedSLA);
      
      if (result) {
        toast({
          title: 'Success',
          description: 'SLA has been added to the job.',
        });
        setRefreshTrigger(prev => prev + 1);
        setShowAddSLADialog(false);
        setSelectedSLA('');
      } else {
        throw new Error('Failed to add SLA');
      }
    } catch (error) {
      console.error('Error adding SLA:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add SLA to job. Please try again.'
      });
    }
  };

  // Acknowledge SLA violation
  const handleAcknowledgeViolation = async (violationId: string) => {
    if (!user?.id) return;
    
    try {
      const result = await acknowledgeSLAViolation(violationId, user.id);
      
      if (result) {
        toast({
          title: 'Success',
          description: 'SLA violation has been acknowledged.',
        });
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error('Failed to acknowledge violation');
      }
    } catch (error) {
      console.error('Error acknowledging violation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to acknowledge violation. Please try again.'
      });
    }
  };

  // Refresh SLA status
  const handleRefreshStatus = async () => {
    if (slaTracking.length === 0) return;
    
    try {
      // Only check and update SLAs that don't have an actual_time (incomplete)
      const incompleteSLAs = slaTracking.filter(sla => !sla.actual_time);
      
      if (incompleteSLAs.length === 0) {
        toast({
          title: 'Info',
          description: 'No active SLAs to refresh.'
        });
        return;
      }
      
      // Check and update the status of each incomplete SLA
      const promises = incompleteSLAs.map(sla => checkAndUpdateSLACompliance(sla.id));
      await Promise.all(promises);
      
      toast({
        title: 'Success',
        description: 'SLA status has been refreshed.',
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to refresh SLA status. Please try again.'
      });
    }
  };

  // Complete an SLA
  const handleCompleteSLA = async (trackingId: string) => {
    try {
      const result = await completeSLATracking(trackingId);
      
      if (result) {
        toast({
          title: 'Success',
          description: 'SLA has been marked as complete.',
        });
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error('Failed to complete SLA');
      }
    } catch (error) {
      console.error('Error completing SLA:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to complete SLA. Please try again.'
      });
    }
  };

  // Filter SLAs based on active tab
  const filteredSLAs = slaTracking.filter(sla => {
    if (activeTab === 'active') {
      return !sla.actual_time;
    } else if (activeTab === 'completed') {
      return !!sla.actual_time;
    } else if (activeTab === 'violated') {
      return sla.compliance_status === 'violated';
    }
    return true;
  });

  // Check if there are any active SLAs
  const hasActiveSLAs = slaTracking.some(sla => !sla.actual_time);
  
  // Check if there are any SLA violations
  const hasViolations = slaTracking.some(sla => sla.compliance_status === 'violated');
  
  // Get unacknowledged violations count
  const unacknowledgedViolations = slaViolations.filter(v => !v.acknowledged).length;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Service Level Agreements</CardTitle>
            <CardDescription>Manage and track SLAs for this job</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleRefreshStatus}
              disabled={!hasActiveSLAs}
              title="Refresh SLA Status"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowAddSLADialog(true)}
              title="Add SLA to Job"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add SLA
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            {hasViolations && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>SLA Violation</AlertTitle>
                <AlertDescription>
                  This job has {unacknowledgedViolations} {unacknowledgedViolations === 1 ? 'unacknowledged violation' : 'unacknowledged violations'}.
                </AlertDescription>
              </Alert>
            )}
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="active">
                  Active
                  {hasActiveSLAs && <Badge variant="outline" className="ml-2">{slaTracking.filter(sla => !sla.actual_time).length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed
                </TabsTrigger>
                <TabsTrigger value="violated">
                  Violations
                  {hasViolations && <Badge variant="destructive" className="ml-2">{slaTracking.filter(sla => sla.compliance_status === 'violated').length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="all">
                  All
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="space-y-4">
                {filteredSLAs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No SLAs found in this category.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SLA Name</TableHead>
                        <TableHead>Metric</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>Target Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSLAs.map((sla) => {
                        const definition = sla.sla_definition;
                        const status = formatSLAStatus(sla.compliance_status);
                        const priority = definition ? formatPriority(definition.priority) : { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
                        
                        return (
                          <TableRow key={sla.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{definition?.name || 'Unknown SLA'}</span>
                                <Badge className={`mt-1 w-fit ${priority.color}`}>
                                  {priority.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {definition ? formatMetricType(definition.metric_type) : 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {definition ? formatTimePeriod(definition.target_value, definition.time_period) : 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{format(new Date(sla.start_time), 'PPp')}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelative(new Date(sla.start_time), new Date())}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{format(new Date(sla.target_time), 'PPp')}</span>
                                <span className="text-xs text-muted-foreground">
                                  {!sla.actual_time ? formatDistanceToNow(new Date(sla.target_time), { addSuffix: true }) : 'Completed'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={status.color}>
                                <span className="flex items-center gap-1">
                                  {status.icon}
                                  {status.label}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {!sla.actual_time ? (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleCompleteSLA(sla.id)}
                                >
                                  Complete
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  {sla.actual_time ? `Completed ${formatRelative(new Date(sla.actual_time), new Date())}` : ''}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
            
            {activeTab === 'violated' && filteredSLAs.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium">Violation Details</h3>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SLA Name</TableHead>
                      <TableHead>Violation Time</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slaViolations.map((violation) => {
                      const tracking = violation.sla_tracking;
                      const definition = tracking?.sla_definition;
                      
                      return (
                        <TableRow key={violation.id}>
                          <TableCell className="font-medium">
                            {definition?.name || 'Unknown SLA'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{format(new Date(violation.violation_time), 'PPp')}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatRelative(new Date(violation.violation_time), new Date())}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {violation.reason || 'SLA target time exceeded'}
                          </TableCell>
                          <TableCell>
                            {violation.acknowledged ? (
                              <Badge variant="outline" className="bg-gray-100">
                                Acknowledged
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                Unacknowledged
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!violation.acknowledged ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleAcknowledgeViolation(violation.id)}
                              >
                                Acknowledge
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Acknowledged by {violation.acknowledged_by || 'unknown'}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      {/* Add SLA Dialog */}
      <Dialog open={showAddSLADialog} onOpenChange={setShowAddSLADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SLA to Job</DialogTitle>
            <DialogDescription>
              Select an SLA template to apply to this job.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sla-select">SLA Template</Label>
              <Select value={selectedSLA} onValueChange={setSelectedSLA}>
                <SelectTrigger id="sla-select">
                  <SelectValue placeholder="Select an SLA template" />
                </SelectTrigger>
                <SelectContent>
                  {slaDefinitions.map((definition) => (
                    <SelectItem key={definition.id} value={definition.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{definition.name}</span>
                        <Badge className={formatPriority(definition.priority).color}>
                          {formatPriority(definition.priority).label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSLA && slaDefinitions.find(d => d.id === selectedSLA) && (
              <div className="pt-2 space-y-2 border-t">
                <h4 className="font-medium">SLA Details</h4>
                {(() => {
                  const definition = slaDefinitions.find(d => d.id === selectedSLA);
                  if (!definition) return null;
                  
                  return (
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="font-medium">Description: </span>
                        {definition.description}
                      </div>
                      <div>
                        <span className="font-medium">Metric Type: </span>
                        {formatMetricType(definition.metric_type)}
                      </div>
                      <div>
                        <span className="font-medium">Target: </span>
                        {formatTimePeriod(definition.target_value, definition.time_period)}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddSLADialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddSLA} disabled={!selectedSLA}>
              Add SLA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 