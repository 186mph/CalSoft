import React, { useState, useEffect } from 'react';
import { Tab, Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { useAuth } from '../../lib/AuthContext';

// Styles from the original code
const styles = {
  app: {
    fontFamily: 'Arial, sans-serif',
    margin: '0 auto',
    padding: '20px',
  },
  title: {
    textAlign: 'center',
    color: 'var(--text-color)',
    marginBottom: '30px',
  },
  headerSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
  },
  formLabel: {
    fontWeight: 'bold',
    marginBottom: '5px',
    color: 'var(--text-color)',
  },
  formInput: {
    padding: '8px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-color)',
  },
  ratesSection: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
  },
  tableContainer: {
    overflowX: 'auto' as const,
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
    backgroundColor: 'var(--table-bg)',
  },
  tableHeader: {
    backgroundColor: 'var(--header-bg)',
    padding: '10px',
    textAlign: 'center' as const,
    border: '1px solid var(--border-color)',
    fontWeight: 'bold',
    color: 'var(--text-color)',
  },
  tableCell: {
    padding: '5px',
    border: '1px solid var(--border-color)',
    textAlign: 'center' as const,
    backgroundColor: 'var(--cell-bg)',
    color: 'var(--text-color)',
  },
  tableInput: {
    width: '95%',
    padding: '5px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    textAlign: 'center' as const,
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-color)',
  },
  calculated: {
    backgroundColor: 'var(--calculated-bg)',
    fontWeight: 'bold',
    color: 'var(--text-color)',
  },
  summarySection: {
    marginTop: '20px',
    width: '400px',
    marginLeft: 'auto',
    backgroundColor: 'var(--summary-bg)',
    padding: '15px',
    borderRadius: '4px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-color)',
  },
  summaryLabel: {
    fontWeight: 'bold',
    color: 'var(--text-color)',
  },
  summaryValue: {
    textAlign: 'right' as const,
    minWidth: '120px',
    color: 'var(--text-color)',
  },
  grandTotal: {
    fontSize: '1.2em',
    fontWeight: 'bold',
    borderTop: '2px solid var(--border-color)',
    paddingTop: '10px',
    backgroundColor: 'var(--total-bg)',
  },
  totalLabel: {
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalValue: {
    fontWeight: 'bold',
    backgroundColor: 'var(--total-bg)',
  },
  tfoot: {
    borderTop: '2px solid var(--border-color)',
  },
};

interface EstimateSheetProps {
  opportunityId: string;
}

interface OpportunityData {
  description: string;
  customer: {
    id: string;
    name: string;
    company_name: string;
    address: string;
  };
}

interface EstimateData {
  client: string;
  jobDescription: string;
  dateDue: string;
  location: string;
  periodOfPerformance: string;
  notes: string;
  items: {
    item: string;
    quantity: number;
    materialPrice: number;
    expensePrice: number;
    laborMen: number;
    laborHours: number;
    notes: string;
  }[];
  calculatedValues: {
    taxRate: number;
    markupRate: number;
    laborRate: number;
    subtotalMaterial: number;
    subtotalExpense: number;
    subtotalLabor: number;
    tax: number;
    markup: number;
    totalMaterial: number;
    totalExpense: number;
    totalLabor: number;
    grandTotal: number;
  };
}

const DEFAULT_LINE_COUNT = 5;
const EMPTY_LINE_ITEM = {
  item: '',
  quantity: 0,
  materialPrice: 0,
  expensePrice: 0,
  laborMen: 0,
  laborHours: 0,
  notes: ''
};

const EMPTY_TRAVEL_ITEM = {
  trips: 1,
  oneWayMiles: 0,
  roundTripMiles: 0,
  totalVehicleMiles: 0,
  numVehicles: 1,
  totalMiles: 0,
  rate: 3.00,
  vehicleTravelCost: 0
};

interface QuoteData {
  id: string;
  created_at: string;
  data: any;
  travel_data: any;
}

export default function EstimateSheet({ opportunityId }: EstimateSheetProps) {
  const theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const [isOpen, setIsOpen] = useState(true);
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [selectedQuoteIndex, setSelectedQuoteIndex] = useState<number>(-1);
  const [isNewQuote, setIsNewQuote] = useState(true);
  const [hasQuote, setHasQuote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showTravel, setShowTravel] = useState(false);
  const [isGettingData, setIsGettingData] = useState(true);
  const [opportunityData, setOpportunityData] = useState<OpportunityData | null>(null);
  const { user } = useAuth(); // Get user at component level

  // State for the travel data object
  const [travelData, setTravelData] = useState({
    travelExpense: [{ ...EMPTY_TRAVEL_ITEM }],
    travelTime: [{
      trips: 1,
      oneWayHours: 0,
      roundTripHours: 0,
      totalTravelHours: 0,
      numMen: 2,
      grandTotalTravelHours: 0,
      rate: 240.00,
      totalTravelLabor: 0
    }],
    perDiem: [{
      numDays: 0,
      firstDayRate: 65.00,
      lastDayRate: 65.00,
      dailyRate: 65.00,
      additionalDays: -2,
      totalPerDiemPerMan: 0,
      numMen: 2,
      totalPerDiem: 0
    }],
    lodging: [{
      numNights: 0,
      numMen: 2,
      manNights: 0,
      rate: 210.00,
      totalAmount: 0
    }],
    localMiles: [{
      numDays: 0,
      numVehicles: 1,
      milesPerDay: 50,
      totalMiles: 0,
      rate: 3.00,
      totalLocalMilesCost: 0
    }],
    flights: [{
      numFlights: 0,
      numMen: 2,
      rate: 600.00,
      luggageFees: 50.00,
      totalFlightAmount: 0
    }],
    airTravelTime: [{
      trips: 0,
      oneWayHoursInAir: 0,
      roundTripTerminalTime: 0,
      totalTravelHours: 0,
      numMen: 0,
      grandTotalTravelHours: 0,
      rate: 240.00,
      totalTravelLabor: 0
    }],
    rentalCar: [{
      numCars: 0,
      rate: 750.00,
      totalAmount: 0
    }]
  });

  // State for the main data object
  const [data, setData] = useState<EstimateData>({
    client: '',
    jobDescription: '',
    dateDue: '',
    location: '',
    periodOfPerformance: '',
    notes: '',
    items: Array(DEFAULT_LINE_COUNT).fill(null).map(() => ({ ...EMPTY_LINE_ITEM })),
    calculatedValues: {
      taxRate: 8.25,
      markupRate: 10,
      laborRate: 75,
      subtotalMaterial: 0,
      subtotalExpense: 0,
      subtotalLabor: 0,
      tax: 0,
      markup: 0,
      totalMaterial: 0,
      totalExpense: 0,
      totalLabor: 0,
      grandTotal: 0
    }
  });
  
  // Fetch opportunity data
  useEffect(() => {
    async function fetchOpportunityData() {
      try {
        // 1. Fetch Opportunity from business schema
        const opportunityColumns = 'id, description, customer_id'; // Select only needed columns
        const { data: oppData, error: oppError } = await supabase
          .schema('business') // Specify business schema
          .from('opportunities')
          .select(opportunityColumns)
          .eq('id', opportunityId)
          .single();

        if (oppError) {
          console.error('Error fetching opportunity data:', oppError);
          throw oppError;
        }

        if (!oppData) {
          console.error('Opportunity not found:', opportunityId);
          return; // Exit if opportunity not found
        }
        
        // 2. Fetch Customer from common schema if customer_id exists
        let customerInfo: OpportunityData['customer'] | null = null;
        if (oppData.customer_id) {
          const { data: custData, error: custError } = await supabase
            .schema('common') // Specify common schema
            .from('customers')
            .select('id, name, company_name, address') // Select needed customer fields
            .eq('id', oppData.customer_id)
            .single<OpportunityData['customer']>();
            
          if (custError) {
            console.error('Error fetching customer data:', custError);
            // Don't throw, maybe just proceed without customer data
          } else if (custData) {
            customerInfo = custData;
          }
        }

        // 3. Combine data and set state
        const transformedData = {
          description: oppData.description || '',
          customer: customerInfo || {
            id: '',
            name: '',
            company_name: '',
            address: ''
          }
        };
        setOpportunityData(transformedData);
        
        // Auto-fill the form data immediately
        const customerName = transformedData.customer.company_name || transformedData.customer.name || '';
        setData(prev => ({
          ...prev,
          client: customerName,
          jobDescription: transformedData.description,
          location: transformedData.customer.address || ''
        }));

      } catch (error) {
        // Catch errors from either Supabase call or processing
        console.error('Error in fetchOpportunityData useEffect:', error);
      } finally {
         // Optional: Add loading state management if needed
      }
    }

    if (opportunityId) {
      fetchOpportunityData();
    }
  }, [opportunityId]);

  useEffect(() => {
    fetchEstimateData();
  }, [opportunityId]);

  async function fetchEstimateData() {
    try {
      const { data: quoteData, error } = await supabase
        .schema('business')
        .from('estimates')
        .select('id, created_at, data, travel_data')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching estimates:', error);
        return;
      }

      if (quoteData && quoteData.length > 0) {
        // Load the most recent quote
        loadQuoteData(quoteData[0]);
        setQuotes(quoteData);
        setSelectedQuoteIndex(0);
        setIsNewQuote(false);
        setHasQuote(true);
      } else {
        // No existing quotes, set up for a new one
        setHasQuote(false);
        setIsNewQuote(true);
      }
    } catch (err) {
        console.error('Catch block error fetching estimates:', err);
    }
  }

  async function checkExistingQuote() {
    // This function might be redundant if fetchEstimateData handles the logic
    // Keeping it for now, but ensure it uses the schema
    try {
      const { count, error } = await supabase
        .schema('business')
        .from('estimates')
        .select('* ', { count: 'exact', head: true })
        .eq('opportunity_id', opportunityId);

      if (error) {
        console.error('Error checking existing quote count:', error);
        setHasQuote(false); // Assume no quote on error
        return;
      }
      
      setHasQuote(count !== null && count > 0);
      
    } catch (err) {
        console.error('Catch block error checking quote count:', err);
        setHasQuote(false);
    }
  }

  async function fetchQuotes() {
    // This might also be redundant if fetchEstimateData is the primary load point
    try {
      const { data, error } = await supabase
        .schema('business')
        .from('estimates')
        .select('id, created_at, data, travel_data')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quotes list:', error);
        setQuotes([]);
        return;
      }
      
      setQuotes(data || []);
      if (data && data.length > 0 && selectedQuoteIndex >= data.length) {
        // Adjust selected index if it becomes invalid after refetch
        setSelectedQuoteIndex(0);
      }
      
    } catch (err) {
        console.error('Catch block error fetching quotes list:', err);
        setQuotes([]);
    }
  }

  // Load specific quote data
  const loadQuoteData = (quote: QuoteData) => {
    setData(quote.data);
    if (quote.travel_data) {
      setTravelData(quote.travel_data);
      setShowTravel(true);
    } else {
      setShowTravel(false);
    }
  };

  // Modified save function to handle new quotes
  async function saveQuote() {
    if (!user) {
        alert('You must be logged in to save a quote.');
        return;
    }
    
    // Ensure opportunityId is valid
    if (!opportunityId) {
        alert('Cannot save quote: Opportunity ID is missing.');
        return;
    }
    
    const quoteRecord = {
      opportunity_id: opportunityId,
      // Use current state data and travelData for saving
      data: JSON.stringify(data), 
      travel_data: showTravel ? JSON.stringify(travelData) : null,
      user_id: user.id // Ensure user_id is included
    };
    
    try {
      setIsSaving(true);
      let result;
      
      // Determine if we are updating an existing selected quote or inserting a new one
      const isUpdating = !isNewQuote && quotes.length > 0 && selectedQuoteIndex < quotes.length;
      const quoteIdToUpdate = isUpdating ? quotes[selectedQuoteIndex]?.id : null;

      if (isUpdating && quoteIdToUpdate) {
        // Update existing quote
        console.log(`Updating estimate with ID: ${quoteIdToUpdate}`);
        result = await supabase
          .schema('business') // Specify schema
          .from('estimates')
          .update(quoteRecord)
          .eq('id', quoteIdToUpdate)
          .select()
          .single(); // Expect a single record back
          
        if (result.data) {
            const updatedQuote = result.data;
            // Update the specific quote in the local state
            setQuotes(prev => 
                prev.map((q, index) => index === selectedQuoteIndex ? updatedQuote : q)
            );
            alert('Quote updated successfully!');
        } else {
             console.warn('Update operation did not return data.');
             // Refetch to be sure state is correct
             await fetchEstimateData(); 
        }
      } else {
        // Insert new quote
        console.log('Inserting new estimate record.');
        result = await supabase
          .schema('business') // Specify schema
          .from('estimates')
          .insert(quoteRecord)
          .select()
          .single(); // Expect a single record back
        
        if (result.data) {
            const newQuote = result.data;
            // Add the new quote to the beginning of the list and select it
            setQuotes(prev => [newQuote, ...prev]);
            setSelectedQuoteIndex(0);
            setIsNewQuote(false); // It's no longer a new quote conceptually
            setHasQuote(true);
            alert('New quote saved successfully!');
        } else {
            console.error('Insert operation did not return data.');
            alert('Quote saved, but failed to retrieve confirmation. Please refresh.')
        }
      }
      
      if (result.error) throw result.error;
      
    } catch (error: any) {
      console.error('Error saving quote:', error);
      alert(`Error saving quote: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  // Reset data for new quote
  const handleGenerateNewQuote = () => {
    setIsNewQuote(true);
    setData({
      client: opportunityData?.customer.company_name || opportunityData?.customer.name || '',
      jobDescription: opportunityData?.description || '',
      dateDue: '',
      location: opportunityData?.customer.address || '',
      periodOfPerformance: '',
      notes: '',
      items: Array(DEFAULT_LINE_COUNT).fill(null).map(() => ({...EMPTY_LINE_ITEM})),
      calculatedValues: {
        taxRate: 8.25,
        markupRate: 10,
        laborRate: 75,
        subtotalMaterial: 0,
        subtotalExpense: 0,
        subtotalLabor: 0,
        tax: 0,
        markup: 0,
        totalMaterial: 0,
        totalExpense: 0,
        totalLabor: 0,
        grandTotal: 0
      }
    });
    setShowTravel(false);
    setIsOpen(true);
  };

  // Function to calculate material extension
  const calculateMaterialExtension = (quantity: number, price: number) => {
    return (quantity || 0) * (price || 0);
  };
  
  // Function to calculate expense extension
  const calculateExpenseExtension = (quantity: number, price: number) => {
    return (quantity || 0) * (price || 0);
  };
  
  // Function to calculate labor unit
  const calculateLaborUnit = (men: number, hours: number) => {
    return (men || 0) * (hours || 0);
  };
  
  // Function to calculate labor total
  const calculateLaborTotal = (quantity: number, men: number, hours: number) => {
    return (quantity || 0) * calculateLaborUnit(men, hours);
  };
  
  // Function to calculate SOV item price
  const calculateSOVItemPrice = (laborTotal: number) => {
    const laborTotalSum = data.calculatedValues.subtotalLabor;
    const finalRate = data.calculatedValues.grandTotal / laborTotalSum;
    return finalRate * laborTotal || 0;
  };

  // Handle input changes
  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...data.items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'item' || field === 'notes' ? value : Number(value)
    };
    
    setData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const handleGeneralChange = (field: string, value: string) => {
    setData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRateChange = (field: string, value: string) => {
    setData(prev => ({
      ...prev,
      calculatedValues: {
        ...prev.calculatedValues,
        [field]: Number(value)
      }
    }));
  };

  // Recalculate all values when data changes
  useEffect(() => {
    const newCalculated = { ...data.calculatedValues };
    
    let materialExtensionTotal = 0;
    let expenseExtensionTotal = 0;
    let laborTotal = 0;
    
    data.items.forEach(item => {
      const materialExtension = calculateMaterialExtension(item.quantity, item.materialPrice);
      const expenseExtension = calculateExpenseExtension(item.quantity, item.expensePrice);
      const laborItemTotal = calculateLaborTotal(item.quantity, item.laborMen, item.laborHours);
      
      materialExtensionTotal += materialExtension;
      expenseExtensionTotal += expenseExtension;
      laborTotal += laborItemTotal;
    });
    
    newCalculated.subtotalMaterial = materialExtensionTotal;
    newCalculated.subtotalExpense = expenseExtensionTotal;
    newCalculated.subtotalLabor = laborTotal;
    
    newCalculated.tax = newCalculated.subtotalMaterial * (newCalculated.taxRate / 100);
    
    const materialAndTax = newCalculated.subtotalMaterial + newCalculated.tax;
    newCalculated.markup = materialAndTax * (newCalculated.markupRate / 100);
    
    newCalculated.totalMaterial = materialAndTax + newCalculated.markup;
    newCalculated.totalExpense = newCalculated.subtotalExpense;
    newCalculated.totalLabor = newCalculated.subtotalLabor * newCalculated.laborRate;
    
    newCalculated.grandTotal = 
      newCalculated.totalMaterial + 
      newCalculated.totalExpense + 
      newCalculated.totalLabor;
    
    setData(prev => ({
      ...prev,
      calculatedValues: newCalculated
    }));
  }, [data.items, data.calculatedValues.taxRate, data.calculatedValues.markupRate, data.calculatedValues.laborRate]);

  const handleAddLine = () => {
    setData(prev => ({
      ...prev,
      items: [...prev.items, {...EMPTY_LINE_ITEM}]
    }));
  };

  const toggleTravel = () => {
    setShowTravel(!showTravel);
  };

  const handleTravelChange = (section: string, index: number, field: string, value: string | number) => {
    setTravelData(prev => {
      const newData = { ...prev };
      const numValue = typeof value === 'string' ? Number(value) : value;
      
      // Update the specified field
      newData[section][index] = {
        ...newData[section][index],
        [field]: numValue
      };
      
      // Calculate derived values based on the section
      const item = newData[section][index];
      
      switch (section) {
        case 'travelExpense':
          item.roundTripMiles = item.oneWayMiles * 2;
          item.totalVehicleMiles = item.trips * item.roundTripMiles;
          item.totalMiles = item.totalVehicleMiles * item.numVehicles;
          item.vehicleTravelCost = item.totalMiles * item.rate;
          break;
          
        case 'travelTime':
          item.roundTripHours = item.oneWayHours * 2;
          item.totalTravelHours = item.trips * item.roundTripHours;
          item.grandTotalTravelHours = item.totalTravelHours * item.numMen;
          item.totalTravelLabor = item.grandTotalTravelHours * item.rate;
          break;
          
        case 'perDiem':
          // Update per diem calculations
          item.totalPerDiemPerMan = item.numDays * item.dailyRate;
          item.totalPerDiem = item.totalPerDiemPerMan * item.numMen;
          
          // Sync lodging nights with per diem days
          if (field === 'numDays') {
            newData.lodging[index] = {
              ...newData.lodging[index],
              numNights: item.numDays
            };
            // Recalculate lodging totals
            const lodgingItem = newData.lodging[index];
            lodgingItem.manNights = lodgingItem.numNights * lodgingItem.numMen;
            lodgingItem.totalAmount = lodgingItem.manNights * lodgingItem.rate;
          }
          break;
          
        case 'lodging':
          item.manNights = item.numNights * item.numMen;
          item.totalAmount = item.manNights * item.rate;
          break;
          
        case 'localMiles':
          item.totalMiles = item.numDays * item.milesPerDay * item.numVehicles;
          item.totalLocalMilesCost = item.totalMiles * item.rate;
          break;
          
        case 'flights':
          item.totalFlightAmount = (item.numFlights * item.numMen * item.rate) + 
            (item.numFlights * item.numMen * item.luggageFees);
          break;
          
        case 'airTravelTime':
          // Update air travel time calculations
          item.roundTripTerminalTime = item.oneWayHoursInAir * 2;
          // Total travel hours is trips * round trip terminal time
          item.totalTravelHours = item.trips * item.roundTripTerminalTime;
          // Grand total travel hours is total travel hours * number of men
          item.grandTotalTravelHours = item.totalTravelHours * item.numMen;
          item.totalTravelLabor = item.grandTotalTravelHours * item.rate;
          break;
          
        case 'rentalCar':
          item.totalAmount = item.numCars * item.rate;
          break;
      }
      
      return newData;
    });
  };

  // Function to update theme variables
  const updateThemeVariables = () => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    
    if (isDark) {
      root.style.setProperty('--text-color', '#E4E6EB');
      root.style.setProperty('--border-color', '#3A3B3D');
      root.style.setProperty('--input-bg', '#242526');
      root.style.setProperty('--header-bg', '#1C1E21');
      root.style.setProperty('--cell-bg', '#242526');
      root.style.setProperty('--calculated-bg', '#1C1E21');
      root.style.setProperty('--table-bg', '#1C1E21');
      root.style.setProperty('--summary-bg', '#242526');
      root.style.setProperty('--total-bg', '#1C1E21');
      root.style.setProperty('--input-text', '#E4E6EB');
      root.style.setProperty('--input-placeholder', '#6B7280');
      root.style.setProperty('--input-border-focus', '#f26722');
    } else {
      root.style.setProperty('--text-color', '#333333');
      root.style.setProperty('--border-color', '#E5E7EB');
      root.style.setProperty('--input-bg', '#FFFFFF');
      root.style.setProperty('--header-bg', '#F9FAFB');
      root.style.setProperty('--cell-bg', '#FFFFFF');
      root.style.setProperty('--calculated-bg', '#F9FAFB');
      root.style.setProperty('--table-bg', '#FFFFFF');
      root.style.setProperty('--summary-bg', '#F9FAFB');
      root.style.setProperty('--total-bg', '#F3F4F6');
      root.style.setProperty('--input-text', '#111827');
      root.style.setProperty('--input-placeholder', '#9CA3AF');
      root.style.setProperty('--input-border-focus', '#f26722');
    }
  };

  // Set up theme observer
  useEffect(() => {
    // Initial theme setup
    updateThemeVariables();

    // Create observer to watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          updateThemeVariables();
        }
      });
    });

    // Start observing the HTML element for class changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Cleanup observer on component unmount
    return () => observer.disconnect();
  }, []);

  // Add global styles for inputs with !important
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .estimate-form input,
      .estimate-form textarea,
      .estimate-form select {
        background-color: var(--input-bg) !important;
        color: var(--input-text) !important;
        border-color: var(--border-color) !important;
        transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
      }
      
      .estimate-form input:focus,
      .estimate-form textarea:focus,
      .estimate-form select:focus {
        border-color: var(--input-border-focus) !important;
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(242, 103, 34, 0.2) !important;
      }
      
      .estimate-form input::placeholder,
      .estimate-form textarea::placeholder {
        color: var(--input-placeholder) !important;
      }
      
      .estimate-form input:disabled,
      .estimate-form textarea:disabled,
      .estimate-form select:disabled {
        background-color: var(--calculated-bg) !important;
        cursor: not-allowed;
      }

      .estimate-form table {
        transition: background-color 0.2s ease !important;
      }

      .estimate-form td,
      .estimate-form th {
        transition: background-color 0.2s ease, border-color 0.2s ease !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="flex space-x-4">
      <Button
        onClick={handleGenerateNewQuote}
        className="bg-[#f26722] text-white hover:bg-[#f26722]/90 transition-colors flex items-center"
      >
        Generate Estimate
      </Button>

      {hasQuote && (
        <Button
          onClick={() => {
            setIsNewQuote(false);
            setIsOpen(true);
          }}
          className="bg-[#f26722] text-white hover:bg-[#f26722]/90 transition-colors flex items-center"
        >
          Show Estimates
        </Button>
      )}

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

          <div className="relative bg-white dark:bg-dark-150 rounded-lg w-[95%] max-w-7xl mx-auto p-6 shadow-xl my-8 estimate-form">
            <div className="absolute top-0 right-0 pt-4 pr-4 flex space-x-2">
              {isNewQuote && (
                <Button
                  onClick={saveQuote}
                  disabled={isSaving}
                  className="bg-[#f26722] text-white hover:bg-[#f26722]/90 transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Quote'}
                </Button>
              )}
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 dark:text-dark-400 dark:hover:text-dark-300"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>

            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-dark-900 mb-6">
              {isNewQuote ? 'New Estimate' : 'Saved Estimates'}
            </Dialog.Title>

            <div className="max-h-[80vh] overflow-y-auto">
              {!isNewQuote && quotes.length > 0 ? (
                <Tab.Group>
                  <Tab.List className="flex space-x-2 border-b border-gray-200 mb-4">
                    {quotes.map((quote, index) => (
                      <Tab
                        key={quote.id}
                        className={({ selected }) =>
                          `px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none ${
                            selected
                              ? 'bg-[#f26722] text-white'
                              : 'bg-gray-100 dark:bg-dark-200 text-gray-500 dark:text-dark-400 hover:bg-gray-200 dark:hover:bg-dark-300'
                          }`
                        }
                        onClick={() => {
                          setSelectedQuoteIndex(index);
                          loadQuoteData(quote);
                        }}
                      >
                        Quote {index + 1}
                      </Tab>
                    ))}
                  </Tab.List>
                </Tab.Group>
              ) : null}

              <div className="mt-4">
                <div style={styles.app}>
                  <div style={styles.headerSection}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Client:</label>
                      <input 
                        type="text" 
                        style={styles.formInput}
                        value={data.client} 
                        onChange={(e) => handleGeneralChange('client', e.target.value)}
                        readOnly
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Job Description:</label>
                      <input 
                        type="text" 
                        style={styles.formInput}
                        value={data.jobDescription} 
                        onChange={(e) => handleGeneralChange('jobDescription', e.target.value)}
                        readOnly
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Date Due:</label>
                      <input 
                        type="date" 
                        style={styles.formInput}
                        value={data.dateDue} 
                        onChange={(e) => handleGeneralChange('dateDue', e.target.value)}
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Location / Address:</label>
                      <input 
                        type="text" 
                        style={styles.formInput}
                        value={data.location} 
                        onChange={(e) => handleGeneralChange('location', e.target.value)}
                        readOnly
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Period of Performance:</label>
                      <input 
                        type="text" 
                        style={styles.formInput}
                        value={data.periodOfPerformance} 
                        onChange={(e) => handleGeneralChange('periodOfPerformance', e.target.value)}
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Notes:</label>
                      <textarea 
                        style={styles.formInput}
                        value={data.notes} 
                        onChange={(e) => handleGeneralChange('notes', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div style={styles.ratesSection}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Tax Rate (%):</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        style={styles.formInput}
                        value={data.calculatedValues.taxRate} 
                        onChange={(e) => handleRateChange('taxRate', e.target.value)}
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Markup Rate (%):</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        style={styles.formInput}
                        value={data.calculatedValues.markupRate} 
                        onChange={(e) => handleRateChange('markupRate', e.target.value)}
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Labor Rate ($/hr):</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        style={styles.formInput}
                        value={data.calculatedValues.laborRate} 
                        onChange={(e) => handleRateChange('laborRate', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.tableHeader}>ITEM</th>
                          <th style={styles.tableHeader}>QUANTITY</th>
                          <th style={styles.tableHeader}>MATERIAL PRICE</th>
                          <th style={styles.tableHeader}>EXPENSE PRICE</th>
                          <th style={styles.tableHeader}>MATERIAL EXTENSION</th>
                          <th style={styles.tableHeader}>EXPENSE EXTENSION</th>
                          <th style={styles.tableHeader}>LABOR (MEN)</th>
                          <th style={styles.tableHeader}>LABOR (HOURS)</th>
                          <th style={styles.tableHeader}>LABOR UNIT</th>
                          <th style={styles.tableHeader}>LABOR TOTAL</th>
                          <th style={styles.tableHeader}>SOV ITEM PRICE</th>
                          <th style={styles.tableHeader}>NOTES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((item, index) => {
                          const materialExtension = calculateMaterialExtension(item.quantity, item.materialPrice);
                          const expenseExtension = calculateExpenseExtension(item.quantity, item.expensePrice);
                          const laborUnit = calculateLaborUnit(item.laborMen, item.laborHours);
                          const laborTotal = calculateLaborTotal(item.quantity, item.laborMen, item.laborHours);
                          const sovItemPrice = calculateSOVItemPrice(laborTotal);
                          
                          return (
                            <tr key={index}>
                              <td style={styles.tableCell}>
                                <input 
                                  type="text" 
                                  style={styles.tableInput}
                                  value={item.item} 
                                  onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                                />
                              </td>
                              <td style={styles.tableCell}>
                                <input 
                                  type="number" 
                                  style={styles.tableInput}
                                  value={item.quantity} 
                                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                />
                              </td>
                              <td style={styles.tableCell}>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  style={styles.tableInput}
                                  value={item.materialPrice} 
                                  onChange={(e) => handleItemChange(index, 'materialPrice', e.target.value)}
                                />
                              </td>
                              <td style={styles.tableCell}>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  style={styles.tableInput}
                                  value={item.expensePrice} 
                                  onChange={(e) => handleItemChange(index, 'expensePrice', e.target.value)}
                                />
                              </td>
                              <td style={{...styles.tableCell, ...styles.calculated}}>
                                ${materialExtension.toFixed(2)}
                              </td>
                              <td style={{...styles.tableCell, ...styles.calculated}}>
                                ${expenseExtension.toFixed(2)}
                              </td>
                              <td style={styles.tableCell}>
                                <input 
                                  type="number" 
                                  style={styles.tableInput}
                                  value={item.laborMen} 
                                  onChange={(e) => handleItemChange(index, 'laborMen', e.target.value)}
                                />
                              </td>
                              <td style={styles.tableCell}>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  style={styles.tableInput}
                                  value={item.laborHours} 
                                  onChange={(e) => handleItemChange(index, 'laborHours', e.target.value)}
                                />
                              </td>
                              <td style={{...styles.tableCell, ...styles.calculated}}>
                                {laborUnit.toFixed(2)}
                              </td>
                              <td style={{...styles.tableCell, ...styles.calculated}}>
                                {laborTotal.toFixed(2)}
                              </td>
                              <td style={{...styles.tableCell, ...styles.calculated}}>
                                ${sovItemPrice.toFixed(2)}
                              </td>
                              <td style={styles.tableCell}>
                                <input 
                                  type="text" 
                                  style={styles.tableInput}
                                  value={item.notes} 
                                  onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    <div className="mt-4 flex justify-end space-x-4">
                      <Button
                        onClick={handleAddLine}
                        className="bg-[#f26722] text-white hover:bg-[#f26722]/90 transition-colors"
                      >
                        Add Line
                      </Button>
                      <Button
                        onClick={toggleTravel}
                        className="bg-[#f26722] text-white hover:bg-[#f26722]/90 transition-colors"
                      >
                        {showTravel ? 'Hide Travel' : 'Add Travel'}
                      </Button>
                    </div>
                  </div>
                  
                  {showTravel && (
                    <div className="mt-8">
                      <h3 className="text-xl font-semibold mb-4">Travel Expenses</h3>
                      
                      <div style={styles.tableContainer}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.tableHeader}>TRIPS</th>
                              <th style={styles.tableHeader}>ONE WAY MILES</th>
                              <th style={styles.tableHeader}>ROUND TRIP MILES</th>
                              <th style={styles.tableHeader}>TOTAL VEHICLE MILES</th>
                              <th style={styles.tableHeader}># OF VEHICLES</th>
                              <th style={styles.tableHeader}>TOTAL MILES</th>
                              <th style={styles.tableHeader}>RATE</th>
                              <th style={styles.tableHeader}>VEHICLE TRAVEL COST</th>
                            </tr>
                          </thead>
                          <tbody>
                            {travelData.travelExpense.map((item, index) => (
                              <tr key={index}>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.trips}
                                    onChange={(e) => handleTravelChange('travelExpense', index, 'trips', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.oneWayMiles}
                                    onChange={(e) => handleTravelChange('travelExpense', index, 'oneWayMiles', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  {item.roundTripMiles}
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  {item.totalVehicleMiles}
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numVehicles}
                                    onChange={(e) => handleTravelChange('travelExpense', index, 'numVehicles', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  {item.totalMiles}
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.rate}
                                    onChange={(e) => handleTravelChange('travelExpense', index, 'rate', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  ${item.vehicleTravelCost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Add the rest of the travel sections (Travel Time, Per Diem, etc.) here */}
                      
                      {/* Travel Time Section */}
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold mb-4">Travel Time</h4>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.tableHeader}>TRIPS</th>
                              <th style={styles.tableHeader}>ONE WAY HOURS</th>
                              <th style={styles.tableHeader}>ROUND TRIP HOURS</th>
                              <th style={styles.tableHeader}>TOTAL TRAVEL HOURS</th>
                              <th style={styles.tableHeader}># OF MEN</th>
                              <th style={styles.tableHeader}>GRAND TOTAL TRAVEL HOURS</th>
                              <th style={styles.tableHeader}>RATE</th>
                              <th style={styles.tableHeader}>TOTAL TRAVEL LABOR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {travelData.travelTime.map((item, index) => (
                              <tr key={index}>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.trips}
                                    onChange={(e) => handleTravelChange('travelTime', index, 'trips', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.oneWayHours}
                                    onChange={(e) => handleTravelChange('travelTime', index, 'oneWayHours', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  {item.roundTripHours}
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  {item.totalTravelHours}
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numMen}
                                    onChange={(e) => handleTravelChange('travelTime', index, 'numMen', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  {item.grandTotalTravelHours}
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.rate}
                                    onChange={(e) => handleTravelChange('travelTime', index, 'rate', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  ${item.totalTravelLabor.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Per Diem Section */}
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold mb-4">Per Diem</h4>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.tableHeader}># OF DAYS</th>
                              <th style={styles.tableHeader}>FIRST DAY RATE</th>
                              <th style={styles.tableHeader}>LAST DAY RATE</th>
                              <th style={styles.tableHeader}>DAILY RATE</th>
                              <th style={styles.tableHeader}>ADDITIONAL DAYS</th>
                              <th style={styles.tableHeader}>TOTAL PER DIEM PER MAN</th>
                              <th style={styles.tableHeader}># OF MEN</th>
                              <th style={styles.tableHeader}>TOTAL PER DIEM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {travelData.perDiem.map((item, index) => (
                              <tr key={index}>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numDays}
                                    onChange={(e) => handleTravelChange('perDiem', index, 'numDays', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.firstDayRate}
                                    onChange={(e) => handleTravelChange('perDiem', index, 'firstDayRate', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.lastDayRate}
                                    onChange={(e) => handleTravelChange('perDiem', index, 'lastDayRate', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.dailyRate}
                                    onChange={(e) => handleTravelChange('perDiem', index, 'dailyRate', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.additionalDays}
                                    onChange={(e) => handleTravelChange('perDiem', index, 'additionalDays', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  ${item.totalPerDiemPerMan.toFixed(2)}
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numMen}
                                    onChange={(e) => handleTravelChange('perDiem', index, 'numMen', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  ${item.totalPerDiem.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Lodging Section */}
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold mb-4">Lodging</h4>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.tableHeader}># OF NIGHTS</th>
                              <th style={styles.tableHeader}># OF MEN</th>
                              <th style={styles.tableHeader}># OF MAN NIGHTS</th>
                              <th style={styles.tableHeader}>RATE</th>
                              <th style={styles.tableHeader}>TOTAL AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {travelData.lodging.map((item, index) => (
                              <tr key={index}>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numNights}
                                    onChange={(e) => handleTravelChange('lodging', index, 'numNights', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numMen}
                                    onChange={(e) => handleTravelChange('lodging', index, 'numMen', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  {item.manNights}
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.rate}
                                    onChange={(e) => handleTravelChange('lodging', index, 'rate', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  ${item.totalAmount.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Local Miles Section */}
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold mb-4">Local Miles</h4>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.tableHeader}># OF DAYS</th>
                              <th style={styles.tableHeader}># OF VEHICLES</th>
                              <th style={styles.tableHeader}>MILES PER DAY</th>
                              <th style={styles.tableHeader}>TOTAL MILES</th>
                              <th style={styles.tableHeader}>RATE</th>
                              <th style={styles.tableHeader}>TOTAL LOCAL MILES COST</th>
                            </tr>
                          </thead>
                          <tbody>
                            {travelData.localMiles.map((item, index) => (
                              <tr key={index}>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numDays}
                                    onChange={(e) => handleTravelChange('localMiles', index, 'numDays', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numVehicles}
                                    onChange={(e) => handleTravelChange('localMiles', index, 'numVehicles', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.milesPerDay}
                                    onChange={(e) => handleTravelChange('localMiles', index, 'milesPerDay', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  {item.totalMiles}
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.rate}
                                    onChange={(e) => handleTravelChange('localMiles', index, 'rate', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  ${item.totalLocalMilesCost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Flights Section */}
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold mb-4">Flights</h4>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.tableHeader}># OF FLIGHTS</th>
                              <th style={styles.tableHeader}># OF MEN</th>
                              <th style={styles.tableHeader}>RATE</th>
                              <th style={styles.tableHeader}>LUGGAGE FEES</th>
                              <th style={styles.tableHeader}>TOTAL FLIGHT AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {travelData.flights.map((item, index) => (
                              <tr key={index}>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numFlights}
                                    onChange={(e) => handleTravelChange('flights', index, 'numFlights', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numMen}
                                    onChange={(e) => handleTravelChange('flights', index, 'numMen', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.rate}
                                    onChange={(e) => handleTravelChange('flights', index, 'rate', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.luggageFees}
                                    onChange={(e) => handleTravelChange('flights', index, 'luggageFees', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  ${item.totalFlightAmount.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Air Travel Time Section */}
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold mb-4">Air Travel Time</h4>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.tableHeader}>TRIPS</th>
                              <th style={styles.tableHeader}>ONE WAY HOURS IN AIR</th>
                              <th style={styles.tableHeader}>ROUND TRIP + TERMINAL TIME</th>
                              <th style={styles.tableHeader}>TOTAL TRAVEL HOURS</th>
                              <th style={styles.tableHeader}># OF MEN</th>
                              <th style={styles.tableHeader}>GRAND TOTAL TRAVEL HOURS</th>
                              <th style={styles.tableHeader}>RATE</th>
                              <th style={styles.tableHeader}>TOTAL TRAVEL LABOR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {travelData.airTravelTime.map((item, index) => (
                              <tr key={index}>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.trips}
                                    onChange={(e) => handleTravelChange('airTravelTime', index, 'trips', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.oneWayHoursInAir}
                                    onChange={(e) => handleTravelChange('airTravelTime', index, 'oneWayHoursInAir', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.roundTripTerminalTime}
                                    onChange={(e) => handleTravelChange('airTravelTime', index, 'roundTripTerminalTime', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  {item.totalTravelHours}
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numMen}
                                    onChange={(e) => handleTravelChange('airTravelTime', index, 'numMen', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  {item.grandTotalTravelHours}
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.rate}
                                    onChange={(e) => handleTravelChange('airTravelTime', index, 'rate', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  ${item.totalTravelLabor.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Rental Car Section */}
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold mb-4">Rental Car</h4>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.tableHeader}># OF CARS</th>
                              <th style={styles.tableHeader}>RATE</th>
                              <th style={styles.tableHeader}>TOTAL AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {travelData.rentalCar.map((item, index) => (
                              <tr key={index}>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    style={styles.tableInput}
                                    value={item.numCars}
                                    onChange={(e) => handleTravelChange('rentalCar', index, 'numCars', e.target.value)}
                                  />
                                </td>
                                <td style={styles.tableCell}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    style={styles.tableInput}
                                    value={item.rate}
                                    onChange={(e) => handleTravelChange('rentalCar', index, 'rate', e.target.value)}
                                  />
                                </td>
                                <td style={{...styles.tableCell, ...styles.calculated}}>
                                  ${item.totalAmount.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Travel Summary Section */}
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold mb-4">Travel Summary</h4>
                        <div style={styles.summarySection}>
                          <div style={styles.summaryRow}>
                            <div style={styles.summaryLabel}>Total Travel Expenses:</div>
                            <div style={styles.summaryValue}>
                              ${(
                                travelData.travelExpense[0].vehicleTravelCost +
                                travelData.travelTime[0].totalTravelLabor +
                                travelData.perDiem[0].totalPerDiem +
                                travelData.lodging[0].totalAmount +
                                travelData.localMiles[0].totalLocalMilesCost +
                                travelData.flights[0].totalFlightAmount +
                                travelData.airTravelTime[0].totalTravelLabor +
                                travelData.rentalCar[0].totalAmount
                              ).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div style={styles.summarySection}>
                    <div style={styles.summaryRow}>
                      <div style={styles.summaryLabel}>Subtotal Material:</div>
                      <div style={styles.summaryValue}>${data.calculatedValues.subtotalMaterial.toFixed(2)}</div>
                    </div>
                    
                    <div style={styles.summaryRow}>
                      <div style={styles.summaryLabel}>Subtotal Expense:</div>
                      <div style={styles.summaryValue}>${data.calculatedValues.subtotalExpense.toFixed(2)}</div>
                    </div>
                    
                    <div style={styles.summaryRow}>
                      <div style={styles.summaryLabel}>Subtotal Labor:</div>
                      <div style={styles.summaryValue}>${(data.calculatedValues.subtotalLabor * data.calculatedValues.laborRate).toFixed(2)}</div>
                    </div>
                    
                    <div style={styles.summaryRow}>
                      <div style={styles.summaryLabel}>Tax ({data.calculatedValues.taxRate}%):</div>
                      <div style={styles.summaryValue}>${data.calculatedValues.tax.toFixed(2)}</div>
                    </div>
                    
                    <div style={styles.summaryRow}>
                      <div style={styles.summaryLabel}>Markup ({data.calculatedValues.markupRate}%):</div>
                      <div style={styles.summaryValue}>${data.calculatedValues.markup.toFixed(2)}</div>
                    </div>
                    
                    <div style={styles.summaryRow}>
                      <div style={styles.summaryLabel}>Total Material:</div>
                      <div style={styles.summaryValue}>${data.calculatedValues.totalMaterial.toFixed(2)}</div>
                    </div>
                    
                    <div style={styles.summaryRow}>
                      <div style={styles.summaryLabel}>Total Expense:</div>
                      <div style={styles.summaryValue}>${data.calculatedValues.totalExpense.toFixed(2)}</div>
                    </div>
                    
                    <div style={styles.summaryRow}>
                      <div style={styles.summaryLabel}>Total Labor:</div>
                      <div style={styles.summaryValue}>${data.calculatedValues.totalLabor.toFixed(2)}</div>
                    </div>
                    
                    <div style={{...styles.summaryRow, ...styles.grandTotal}}>
                      <div style={styles.summaryLabel}>GRAND TOTAL:</div>
                      <div style={styles.summaryValue}>
                        ${(data.calculatedValues.grandTotal + (showTravel ? (
                          travelData.travelExpense[0].vehicleTravelCost +
                          travelData.travelTime[0].totalTravelLabor +
                          travelData.perDiem[0].totalPerDiem +
                          travelData.lodging[0].totalAmount +
                          travelData.localMiles[0].totalLocalMilesCost +
                          travelData.flights[0].totalFlightAmount +
                          travelData.airTravelTime[0].totalTravelLabor +
                          travelData.rentalCar[0].totalAmount
                        ) : 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
} 