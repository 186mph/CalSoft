import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SelectRoot, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Plus, Search, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useDivision } from '@/App';
import { getDivisionAccentClasses } from '@/lib/utils';
import { toast } from '@/components/ui/toast';

interface CalibrationJobButtonProps {
  onJobCreated?: () => void;
  buttonText?: string;
  division?: 'calibration' | 'armadillo';
}

export function CalibrationJobButton({ 
  onJobCreated, 
  buttonText = "New Lab Job",
  division 
}: CalibrationJobButtonProps) {
  console.log('[CalibrationJobButton] Component rendering with props:', { buttonText, division, onJobCreated: !!onJobCreated });
  
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { division: appDivision } = useDivision();

  // Determine division from buttonText if not explicitly provided
  const getJobDivision = () => {
    if (division) return division;
    if (buttonText?.toLowerCase().includes('armadillo')) return 'armadillo';
    return 'calibration'; // Default to calibration
  };

  const jobDivision = getJobDivision();

  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    priority: 'medium',
    notes: ''
  });

  // State for generated job number
  const [generatedJobNumber, setGeneratedJobNumber] = useState<string>('');

  // Auto-generate job number when dialog opens for both calibration and armadillo divisions
  useEffect(() => {
    if (showDialog && (jobDivision === 'calibration' || jobDivision === 'armadillo')) {
      generateJobNumber().then(jobNumber => {
        setGeneratedJobNumber(jobNumber);
      });
    }
  }, [showDialog, jobDivision]);

  // Fetch calibration customers from lab_ops.lab_customers
  const fetchCustomers = async () => {
    try {
      console.log('[CalibrationJobButton] Fetching customers from lab_ops.lab_customers...');
      setLoading(true);
      
      // First try to get customers from lab_customers
      const { data: labCustomers, error: labError } = await supabase
        .schema('lab_ops')
        .from('lab_customers')
        .select('*')
        .eq('status', 'active')
        .order('company_name', { ascending: true });

      console.log('[CalibrationJobButton] Lab customers query result:', { 
        count: labCustomers?.length || 0, 
        labError,
        customers: labCustomers?.map(c => ({ id: c.id, name: c.name, company_name: c.company_name }))
      });

      if (labError) {
        console.log('[CalibrationJobButton] Error with lab_customers:', labError);
        // If lab_customers doesn't exist or has error, fallback to common.customers
        const { data: commonCustomers, error: commonError } = await supabase
          .schema('common')
          .from('customers')
          .select('*')
          .eq('status', 'active')
          .order('company_name', { ascending: true });

        if (commonError) {
          console.error('[CalibrationJobButton] Error with common.customers:', commonError);
          throw commonError;
        }

        console.log('[CalibrationJobButton] Using common customers as fallback:', {
          count: commonCustomers?.length || 0,
          customers: commonCustomers?.map(c => ({ id: c.id, name: c.name, company_name: c.company_name }))
        });
        setCustomers(commonCustomers || []);
        return;
      }

      // If we have lab customers but the list is empty, try to populate from common customers
      if (!labCustomers || labCustomers.length === 0) {
        console.log('[CalibrationJobButton] No lab customers found, trying to populate from common.customers...');
        
        const { data: commonCustomers, error: commonError } = await supabase
          .schema('common')
          .from('customers')
          .select('*')
          .eq('status', 'active')
          .limit(10); // Get first 10 to avoid overwhelming

        if (commonError) {
          console.log('[CalibrationJobButton] Error fetching common customers:', commonError);
          setCustomers([]);
          return;
        }

        console.log('[CalibrationJobButton] Found common customers for population:', {
          count: commonCustomers?.length || 0,
          customers: commonCustomers?.map(c => ({ id: c.id, name: c.name, company_name: c.company_name }))
        });

        if (commonCustomers && commonCustomers.length > 0) {
          console.log('[CalibrationJobButton] Found common customers, copying to lab_customers...');
          
          // Copy customers to lab_customers table
          const insertPromises = commonCustomers.map(async (customer) => {
            try {
              console.log('[CalibrationJobButton] Inserting customer:', customer.id, customer.company_name);
              const { data: insertedData, error: insertError } = await supabase
                .schema('lab_ops')
                .from('lab_customers')
                .insert({
                  id: customer.id,
                  name: customer.name,
                  company_name: customer.company_name,
                  address: customer.address,
                  phone: customer.phone,
                  email: customer.email,
                  status: customer.status || 'active'
                })
                .select()
                .single();

              if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
                console.log('[CalibrationJobButton] Error inserting customer:', customer.id, insertError);
              } else {
                console.log('[CalibrationJobButton] Successfully inserted customer:', customer.id);
              }
              return insertedData;
            } catch (insertError) {
              console.log('[CalibrationJobButton] Exception inserting customer:', customer.id, insertError);
              return null;
            }
          });

          await Promise.all(insertPromises);

          // Now fetch the lab customers again
          const { data: newLabCustomers, error: newLabError } = await supabase
            .schema('lab_ops')
            .from('lab_customers')
            .select('*')
            .eq('status', 'active')
            .order('company_name', { ascending: true });

          if (newLabError) {
            console.log('[CalibrationJobButton] Error refetching lab customers:', newLabError);
            setCustomers(commonCustomers || []);
          } else {
            console.log('[CalibrationJobButton] Successfully populated lab customers:', {
              count: newLabCustomers?.length || 0,
              customers: newLabCustomers?.map(c => ({ id: c.id, name: c.name, company_name: c.company_name }))
            });
            setCustomers(newLabCustomers || []);
          }
        } else {
          console.log('[CalibrationJobButton] No customers found in common.customers either');
          setCustomers([]);
        }
      } else {
        console.log('[CalibrationJobButton] Found existing lab customers:', {
          count: labCustomers?.length || 0,
          customers: labCustomers?.map(c => ({ id: c.id, name: c.name, company_name: c.company_name }))
        });
        setCustomers(labCustomers || []);
      }
    } catch (err) {
      console.error('[CalibrationJobButton] Error in fetchCustomers:', err);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive"
      });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[CalibrationJobButton] Dialog state changed:', showDialog);
    if (showDialog) {
      fetchCustomers();
    }
  }, [showDialog]);

  // Handle clicking outside the customer dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    }
    
    if (isCustomerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomerDropdownOpen]);

  // Filter customers based on search query
  const getFilteredCustomers = () => {
    if (!customerSearchQuery.trim()) {
      return customers;
    }
    
    return customers.filter(customer => {
      const companyName = customer.company_name?.toLowerCase() || '';
      const name = customer.name?.toLowerCase() || '';
      const searchTerm = customerSearchQuery.toLowerCase();
      return companyName.includes(searchTerm) || name.includes(searchTerm);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper function to get selected customer display name
  const getSelectedCustomerName = (customerId: string) => {
    if (!customerId) return 'Select Customer';
    const customer = customers.find(c => c.id === customerId);
    return customer?.company_name || customer?.name || 'Select Customer';
  };

  // Handle customer search input change
  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearchQuery(e.target.value);
    setIsCustomerDropdownOpen(true);
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: any) => {
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setCustomerSearchQuery(customer.company_name || customer.name || '');
    setIsCustomerDropdownOpen(false);
  };

  // Handle customer search input focus
  const handleCustomerSearchFocus = () => {
    setIsCustomerDropdownOpen(true);
    if (!customerSearchQuery && formData.customer_id) {
      // If there's a selected customer but no search query, populate with selected customer name
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      if (selectedCustomer) {
        setCustomerSearchQuery(selectedCustomer.company_name || selectedCustomer.name || '');
      }
    }
  };

  // Handle keyboard navigation in customer search
  const handleCustomerSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsCustomerDropdownOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsCustomerDropdownOpen(true);
    }
  };

  // Handle clearing customer selection
  const handleClearCustomer = () => {
    setFormData(prev => ({ ...prev, customer_id: '' }));
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
  };

  // Initialize customer search query when customer is selected
  useEffect(() => {
    if (formData.customer_id && customers.length > 0 && !customerSearchQuery) {
      const selectedCustomer = customers.find(c => c.id === formData.customer_id);
      if (selectedCustomer) {
        setCustomerSearchQuery(selectedCustomer.company_name || selectedCustomer.name || '');
      }
    }
  }, [formData.customer_id, customers]);

  // Function to generate automatic job number for both Calibration and Armadillo divisions
  const generateJobNumber = async (): Promise<string> => {
    try {
      if (jobDivision === 'calibration') {
        // Calibration format: 1YYXXX (1 + year last 2 digits + 3-digit sequential)
        const currentYear = new Date().getFullYear();
        const yearSuffix = String(currentYear).slice(-2); // e.g., "25" for 2025
        const yearPrefix = `1${yearSuffix}`;
        
        const { data: existingJobs, error } = await supabase
          .schema('lab_ops')
          .from('lab_jobs')
          .select('job_number')
          .like('job_number', `${yearPrefix}%`)
          .order('job_number', { ascending: false });
        
        if (error) {
          console.error('Error fetching existing job numbers:', error);
          return `${yearPrefix}000`; // Fallback to first number
        }
        
        // Find the highest sequential number for this year
        let highestNumber = 0;
        
        if (existingJobs && existingJobs.length > 0) {
          for (const job of existingJobs) {
            if (job.job_number && job.job_number.length === 6) {
              // Extract the last 3 digits
              const sequentialPart = job.job_number.slice(-3);
              const num = parseInt(sequentialPart, 10);
              if (!isNaN(num) && num > highestNumber) {
                highestNumber = num;
              }
            }
          }
        }
        
        // Generate next sequential number
        const nextNumber = highestNumber + 1;
        const formattedNumber = String(nextNumber).padStart(3, '0');
        
        return `${yearPrefix}${formattedNumber}`;
        
      } else if (jobDivision === 'armadillo') {
        // Armadillo format: AS-X (AS + dash + sequential number starting from 1)
        const { data: existingJobs, error } = await supabase
          .schema('lab_ops')
          .from('lab_jobs')
          .select('job_number')
          .like('job_number', 'AS-%')
          .order('job_number', { ascending: false });
        
        if (error) {
          console.error('Error fetching existing Armadillo job numbers:', error);
          return 'AS-1'; // Fallback to first number
        }
        
        // Find the highest sequential number for Armadillo jobs
        let highestNumber = 0;
        
        if (existingJobs && existingJobs.length > 0) {
          for (const job of existingJobs) {
            if (job.job_number && job.job_number.startsWith('AS-')) {
              // Extract the number after "AS-"
              const sequentialPart = job.job_number.substring(3);
              const num = parseInt(sequentialPart, 10);
              if (!isNaN(num) && num > highestNumber) {
                highestNumber = num;
              }
            }
          }
        }
        
        // Generate next sequential number
        const nextNumber = highestNumber + 1;
        
        return `AS-${nextNumber}`;
      }
      
      // If neither calibration nor armadillo, return empty
      return '';
    } catch (error) {
      console.error('Error generating job number:', error);
      // Fallback generation based on division
      if (jobDivision === 'calibration') {
        const currentYear = new Date().getFullYear();
        const yearSuffix = String(currentYear).slice(-2);
        return `1${yearSuffix}000`;
      } else if (jobDivision === 'armadillo') {
        return 'AS-1';
      }
      return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a job",
        variant: "destructive"
      });
      return;
    }

    if (!formData.customer_id) {
      toast({
        title: "Error",
        description: "Please select a customer from the dropdown",
        variant: "destructive"
      });
      return;
    }

    // Additional validation: ensure the selected customer exists in our customer list
    const selectedCustomer = customers.find(c => c.id === formData.customer_id);
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a valid customer from the dropdown",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('[CalibrationJobButton] Starting job creation for customer_id:', formData.customer_id);

      // Validate that the selected customer exists in lab_customers
      console.log('[CalibrationJobButton] Checking if customer exists in lab_customers...');
      const { data: customerExists, error: customerCheckError } = await supabase
        .schema('lab_ops')
        .from('lab_customers')
        .select('id, name, company_name')
        .eq('id', formData.customer_id)
        .single();

      console.log('[CalibrationJobButton] Customer check result:', { customerExists, customerCheckError });

      if (customerCheckError || !customerExists) {
        console.log('[CalibrationJobButton] Customer validation failed, attempting to copy from common.customers...');
        
        // Try to get the customer from common.customers
        const { data: commonCustomer, error: commonError } = await supabase
          .schema('common')
          .from('customers')
          .select('*')
          .eq('id', formData.customer_id)
          .single();

        console.log('[CalibrationJobButton] Common customer result:', { commonCustomer, commonError });

        if (commonError || !commonCustomer) {
          console.error('[CalibrationJobButton] Customer not found in either schema');
          throw new Error('Selected customer not found. Please refresh and try again.');
        }

        // Add customer to lab_customers with explicit error handling
        console.log('[CalibrationJobButton] Attempting to insert customer into lab_customers:', {
          id: commonCustomer.id,
          name: commonCustomer.name,
          company_name: commonCustomer.company_name
        });

        const { data: insertedCustomer, error: insertError } = await supabase
          .schema('lab_ops')
          .from('lab_customers')
          .insert({
            id: commonCustomer.id,
            name: commonCustomer.name,
            company_name: commonCustomer.company_name,
            address: commonCustomer.address,
            phone: commonCustomer.phone,
            email: commonCustomer.email,
            status: commonCustomer.status || 'active'
          })
          .select()
          .single();

        console.log('[CalibrationJobButton] Customer insert result:', { insertedCustomer, insertError });

        if (insertError) {
          console.error('[CalibrationJobButton] Failed to insert customer:', insertError);
          
          // Check if it's a duplicate key error (customer already exists)
          if (insertError.code === '23505') {
            console.log('[CalibrationJobButton] Customer already exists, continuing...');
          } else {
            throw new Error(`Failed to set up customer for lab operations: ${insertError.message}`);
          }
        }

        // Double-check that customer now exists in lab_customers
        console.log('[CalibrationJobButton] Verifying customer was added to lab_customers...');
        const { data: verifyCustomer, error: verifyError } = await supabase
          .schema('lab_ops')
          .from('lab_customers')
          .select('id, name, company_name')
          .eq('id', formData.customer_id)
          .single();

        console.log('[CalibrationJobButton] Customer verification result:', { verifyCustomer, verifyError });

        if (verifyError || !verifyCustomer) {
          console.error('[CalibrationJobButton] Customer verification failed after insert');
          throw new Error('Failed to verify customer setup. Please try again.');
        }

        console.log('[CalibrationJobButton] Customer successfully verified in lab_customers');
      } else {
        console.log('[CalibrationJobButton] Customer exists in lab_customers:', customerExists);
      }

      // Use pre-generated job number for calibration and armadillo divisions
      let jobNumber = '';
      if (jobDivision === 'calibration' || jobDivision === 'armadillo') {
        jobNumber = generatedJobNumber || await generateJobNumber(); // Use pre-generated or fallback
        console.log(`[CalibrationJobButton] Using job number for ${jobDivision}:`, jobNumber);
      }

      // Create the job in lab_ops.lab_jobs
      console.log('[CalibrationJobButton] Creating job with validated customer_id:', formData.customer_id);
      const jobData = {
        customer_id: formData.customer_id,
        title: `${jobDivision.charAt(0).toUpperCase() + jobDivision.slice(1)} Job`,
        description: formData.description,
        status: 'pending',
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        notes: formData.notes,
        priority: formData.priority,
        division: jobDivision,
        ...(jobNumber && { job_number: jobNumber }) // Include job_number for calibration division
      };

      console.log('[CalibrationJobButton] Job data to insert:', jobData);

      // TEMPORARY WORKAROUND: Try inserting directly first, then handle constraint error
      let jobCreationResult;
      try {
        jobCreationResult = await supabase
          .schema('lab_ops')
          .from('lab_jobs')
          .insert(jobData)
          .select()
          .single();

        console.log('[CalibrationJobButton] Direct job creation result:', jobCreationResult);
      } catch (directError) {
        console.log('[CalibrationJobButton] Direct job creation failed, trying workaround...');
        
        // If direct creation fails, try using the RPC function to disable constraint checking temporarily
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_lab_job_with_customer_check', {
          job_data: jobData
        });

        if (rpcError) {
          console.log('[CalibrationJobButton] RPC creation also failed:', rpcError);
          jobCreationResult = { data: null, error: directError }; // Use original error
        } else {
          console.log('[CalibrationJobButton] RPC creation succeeded:', rpcResult);
          jobCreationResult = { data: rpcResult, error: null };
        }
      }

      const { data, error } = jobCreationResult;

      if (error) {
        console.error('[CalibrationJobButton] Job creation error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Provide specific error messages for common issues
        if (error.code === '23503') {
          // Foreign key constraint violation - try one more time with manual customer validation
          console.log('[CalibrationJobButton] Attempting manual customer validation and insert...');
          
          // Create a minimal customer record if it doesn't exist
          await supabase
            .schema('lab_ops')
            .from('lab_customers')
            .upsert({
              id: formData.customer_id,
              name: 'Auto-created Customer',
              company_name: 'Unknown Company',
              status: 'active'
            }, {
              onConflict: 'id'
            });

          // Try the job creation one more time
          const { data: retryData, error: retryError } = await supabase
            .schema('lab_ops')
            .from('lab_jobs')
            .insert(jobData)
            .select()
            .single();

          if (retryError) {
            throw new Error('Database relationship error. Please contact support. (Error: Foreign key constraint issue)');
          } else {
            console.log('[CalibrationJobButton] Retry job creation succeeded:', retryData);
            // Use the retry result
            Object.assign(jobCreationResult, { data: retryData, error: null });
          }
        } else if (error.message?.includes('foreign key constraint')) {
          throw new Error('Customer reference error. Please refresh the page and try again.');
        } else if (error.message?.includes('duplicate key')) {
          throw new Error('A job with this information already exists.');
        } else {
          throw new Error(`Job creation failed: ${error.message}`);
        }
      }

      // If we get here, job creation was successful
      const finalData = jobCreationResult.data || data;
      console.log('[CalibrationJobButton] Job created successfully:', finalData);

      toast({
        title: "Success",
        description: `${jobDivision.charAt(0).toUpperCase() + jobDivision.slice(1)} job created successfully with job number: ${finalData.job_number}`
      });

      setShowDialog(false);
      setFormData({
        customer_id: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: '',
        priority: 'medium',
        notes: ''
      });
      setGeneratedJobNumber(''); // Clear generated job number
      setCustomerSearchQuery(''); // Clear customer search
      setIsCustomerDropdownOpen(false); // Close customer dropdown

      if (onJobCreated) {
        onJobCreated();
      }
    } catch (err: any) {
      console.error(`[CalibrationJobButton] Error creating ${jobDivision} job:`, err);
      
      // Show user-friendly error message
      const errorMessage = err.message || `Failed to create ${jobDivision} job`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonColor = () => {
    // Use the current app division context to determine colors
    const accentClasses = getDivisionAccentClasses(appDivision);
    
    if (jobDivision === 'armadillo') {
      return `${accentClasses.bg} ${accentClasses.bgHover} text-white`;
    }
    // For calibration jobs, use division-aware colors
    return `${accentClasses.bg} ${accentClasses.bgHover} text-white`;
  };

  const getDialogTitle = () => {
    return `Create New ${jobDivision.charAt(0).toUpperCase() + jobDivision.slice(1)} Job`;
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className={getButtonColor()}
      >
        <Plus className="h-4 w-4 mr-2" />
        {buttonText}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer *</label>
                {loading ? (
                  <div className="text-sm">Loading customers...</div>
                ) : customers.length === 0 ? (
                  <div className="text-sm text-red-600">
                    No customers available. Please ensure customers exist in the system.
                  </div>
                ) : (
                  <div className="relative" ref={customerDropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        type="text"
                        placeholder="Search customers..."
                        value={customerSearchQuery}
                        onChange={handleCustomerSearchChange}
                        onFocus={handleCustomerSearchFocus}
                        onKeyDown={handleCustomerSearchKeyDown}
                        className="pl-10 pr-16 !border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                        {formData.customer_id && customers.find(c => c.id === formData.customer_id) && (
                          <span title="Customer selected">
                            <Check className="w-4 h-4 text-green-500" />
                          </span>
                        )}
                        {customerSearchQuery && (
                          <button
                            type="button"
                            onClick={handleClearCustomer}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Clear selection"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          title={isCustomerDropdownOpen ? "Close dropdown" : "Open dropdown"}
                        >
                          {isCustomerDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {isCustomerDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-150 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {getFilteredCustomers().length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            {customerSearchQuery ? 'No customers found matching your search' : 'No customers available'}
                          </div>
                        ) : (
                          getFilteredCustomers().map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleCustomerSelect(customer)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#339C5E] hover:text-white focus:bg-[#339C5E] focus:text-white transition-colors ${
                                formData.customer_id === customer.id ? 'bg-[#339C5E] text-white' : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              <div className="font-medium">
                                {customer.company_name || customer.name}
                              </div>
                              {customer.company_name && customer.name && customer.company_name !== customer.name && (
                                <div className="text-xs opacity-75">
                                  {customer.name}
                                </div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Job Number field - read-only for calibration and armadillo divisions */}
              {(jobDivision === 'calibration' || jobDivision === 'armadillo') && (
              <div>
                  <label className="block text-sm font-medium mb-1">Job Number</label>
                <Input
                    value={generatedJobNumber}
                    readOnly
                    placeholder={jobDivision === 'calibration' ? "Auto-generating..." : "Auto-generating AS-X..."}
                    className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed !border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E]"
                />
              </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder={`Describe the ${jobDivision} work to be performed...`}
                  rows={3}
                  className="!border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="!border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <Input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  className="!border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <SelectRoot value={formData.priority} onValueChange={handleSelectChange('priority')}>
                  <SelectTrigger className="!border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E] [&[data-state=open]]:!ring-2 [&[data-state=open]]:!ring-[#339C5E] [&[data-state=open]]:!border-[#339C5E]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem 
                      value="low"
                      className="hover:bg-[#339C5E] hover:text-white focus:bg-[#339C5E] focus:text-white data-[highlighted]:bg-[#339C5E] data-[highlighted]:text-white"
                    >
                      Low
                    </SelectItem>
                    <SelectItem 
                      value="medium"
                      className="hover:bg-[#339C5E] hover:text-white focus:bg-[#339C5E] focus:text-white data-[highlighted]:bg-[#339C5E] data-[highlighted]:text-white"
                    >
                      Medium
                    </SelectItem>
                    <SelectItem 
                      value="high"
                      className="hover:bg-[#339C5E] hover:text-white focus:bg-[#339C5E] focus:text-white data-[highlighted]:bg-[#339C5E] data-[highlighted]:text-white"
                    >
                      High
                    </SelectItem>
                  </SelectContent>
                </SelectRoot>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes or special requirements..."
                  rows={3}
                  className="!border-gray-300 dark:!border-gray-600 focus:!ring-[#339C5E] focus:!border-[#339C5E] hover:!border-[#339C5E]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex items-center bg-white dark:bg-gray-700 border-[#339C5E] hover:bg-[#339C5E]/10 hover:text-[#339C5E] dark:hover:bg-[#339C5E]/20"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || customers.length === 0 || !formData.customer_id}
                className={getButtonColor()}
              >
                {isSubmitting ? 'Creating...' : 'Create Job'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CalibrationJobButton; 