import React, { createContext, useState, useContext, ReactNode, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useParams, useNavigationType } from 'react-router-dom';
import CustomerList from './components/customers/CustomerList';
import ContactList from './components/customers/ContactList';
import JobList from './components/jobs/JobList';
import CustomerDetail from './components/customers/CustomerDetail';
import ContactDetail from './components/customers/ContactDetail';
import JobDetail from './components/jobs/JobDetail';
import Dashboard from './app/dashboard/page';
import PortalLanding from './app/portal/page';
import SalesDashboard from './app/sales-dashboard/page';
import Login from './components/auth/Login';
import JobDiagnostics from './components/jobs/JobDiagnostics';
import OpportunityList from './components/jobs/OpportunityList';
import OpportunityDetail from './components/jobs/OpportunityDetail';
import { AuthProvider, RequireAuth } from './lib/AuthContext';
import { ThemeProvider } from './components/theme/theme-provider';
import DebugTableCheck from './components/debug/debug-table';
import ChatDebug from './components/chat/ChatDebug';
import { Layout } from './components/ui/Layout';
import SalesLayout from './components/ui/SalesLayout';
import SwitchgearReport from './components/reports/SwitchgearReport';
import PanelboardReport from './components/reports/PanelboardReport';
import DryTypeTransformerReport from './components/reports/DryTypeTransformerReport';
import LargeDryTypeTransformerReport from '@/components/reports/LargeDryTypeTransformerReport';
import LiquidFilledTransformerReport from './components/reports/LiquidFilledTransformerReport';
import OilInspectionReport from './components/reports/OilInspectionReport';
import TwelveSetsLowVoltageCableTestForm from './components/reports/12setslowvoltagecables';
import TwentySetsLowVoltageCableTestForm from './components/reports/20SetsLowVoltageCables';
import TanDeltaChart from './components/reports/TanDeltaChart';
import MediumVoltageVLFReport from './components/reports/MediumVoltageVLFReport';
import MediumVoltageCableVLFTest from './components/reports/MediumVoltageCableVLFTest';
import ProfileSetup from './pages/ProfileSetup';
import TechnicianProfilesPage from './pages/TechnicianProfilesPage';
import CustomerCategoriesPage from './pages/CustomerCategoriesPage';
import ReportsPage from './app/[division]/reports/page';
import AdminDashboard from './app/admin-dashboard/page';
import { ChatWindowProvider } from './context/ChatWindowContext';
import ChatWindowManager from './components/chat/ChatWindowManager';
import SchedulingPage from './app/scheduling/page';
import GoalsPage from './app/(dashboard)/sales/goals/page';
import NewGoalPage from './app/(dashboard)/sales/goals/new/page';
import EditGoalPage from './app/(dashboard)/sales/goals/[id]/edit/page';
import GoalsDashboardPage from './app/(dashboard)/sales/goals/dashboard/page';
import GoalManagementPage from './app/(dashboard)/sales/goals/management/page';
import EngineeringPage from './app/engineering/page';
import EngineeringDashboard from './app/engineering/dashboard/page';
import { EncryptionSettings } from './components/admin/EncryptionSettings';

// MUI X Date Pickers setup
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Import Lab Portal components
import { EquipmentCalibration } from './components/lab/EquipmentCalibration';
import { TestingProcedures } from './components/lab/TestingProcedures';
import { CertificateGenerator } from './components/lab/CertificateGenerator';
import { QualityMetrics } from './components/lab/QualityMetrics';
import { LabDashboard } from './components/lab/LabDashboard';

// Import division-specific dashboards
import NorthAlabamaDashboard from './app/dashboards/NorthAlabamaDashboard';
import TennesseeDashboard from './app/dashboards/TennesseeDashboard';
import GeorgiaDashboard from './app/dashboards/GeorgiaDashboard';
import InternationalDashboard from './app/dashboards/InternationalDashboard';
import CalibrationDashboard from './app/dashboards/CalibrationDashboard';
import ArmadilloDashboard from './app/dashboards/ArmadilloDashboard';
import ScavengerDashboard from './app/dashboards/ScavengerDashboard';

// Import Equipment Management
import EquipmentPage from './app/[division]/equipment/page';
// Import Maintenance Management
import MaintenancePage from './app/[division]/maintenance/page';

// Add territory management imports
import TerritoryManagement from './components/sales/TerritoryManagement';

// Import Engineering components properly with the right casing
import { DesignApprovalWorkflow } from './components/engineering/DesignApprovalWorkflow';
import { TechnicalDocumentationLibrary } from './components/engineering/TechnicalDocumentationLibrary';
import { StandardsComplianceUpdates } from './components/engineering/StandardsComplianceUpdates';
import DrawingRepository from './components/engineering/DrawingRepository';

// Import HR Portal component
import HRPortal from './app/hr/page';

// Import Office Administration Portal component
import OfficeAdministrationPortal from './app/office/page';

// Import Resource Management component
import ResourceManagement from './components/resources/ResourceManagement';

// Import AuthCallback component
import AuthCallback from './components/auth/AuthCallback';

// Import the initializeRoles function
import { initializeRoles } from './services/roleService';

// Import supabase
import { supabase } from './lib/supabase';

// Import Low Voltage Switch Multi-Device Test component
import LowVoltageSwitchWithPrint from './components/reports/LowVoltageSwitchMultiDeviceTest';
// Import Low Voltage Switch Report component
import LowVoltageSwitchReport from './components/reports/LowVoltageSwitchReport';
// Import Metal Enclosed Busway Report component
import MetalEnclosedBuswayReport from './components/reports/MetalEnclosedBuswayReport';

// Import Medium Voltage Switch Oil Report component
import MediumVoltageSwitchOilReport from './components/reports/MediumVoltageSwitchOilReport';

// Import Low Voltage Circuit Breaker Electronic Trip Unit ATS Report component
import LowVoltageCircuitBreakerElectronicTripATSSecondaryInjectionReport from './components/reports/LowVoltageCircuitBreakerElectronicTripATSSecondaryInjectionReport';
import LowVoltageCircuitBreakerElectronicTripATSReport from './components/reports/LowVoltageCircuitBreakerElectronicTripATSReport';
import LowVoltageCircuitBreakerThermalMagneticATSReport from './components/reports/LowVoltageCircuitBreakerThermalMagneticATSReport';

// Import the new Small Breaker Panelboard report
import LowVoltagePanelboardSmallBreakerTestATSReport from './components/reports/LowVoltagePanelboardSmallBreakerTestATSReport';

// --- Define Division Context --- Start
interface DivisionContextType {
  division: string | null;
  setDivision: (division: string | null) => void;
}

const DivisionContext = createContext<DivisionContextType | undefined>(undefined);

export const DivisionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [division, setDivisionState] = useState<string | null>(() => {
    const savedDivision = localStorage.getItem('selectedDivision');
    console.log('Initial division from localStorage:', savedDivision);
    return savedDivision;
  });

  const setDivision = (newDivision: string | null) => {
    console.log('Setting division to:', newDivision);
    setDivisionState(newDivision);
    if (newDivision) {
      localStorage.setItem('selectedDivision', newDivision);
    } else {
      localStorage.removeItem('selectedDivision');
    }
  };

  useEffect(() => {
    console.log('Current division state:', division);
  }, [division]);

  return (
    <DivisionContext.Provider value={{ division, setDivision }}>
      {children}
    </DivisionContext.Provider>
  );
};

export const useDivision = () => {
  const context = useContext(DivisionContext);
  if (context === undefined) {
    throw new Error('useDivision must be used within a DivisionProvider');
  }
  return context;
};
// --- Define Division Context --- End

// Add a ScrollToTop component that will reset scroll position on route changes
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  
  useLayoutEffect(() => {
    // Scroll to top on navigation except when user uses browser back/forward
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navigationType]);
  
  return null;
}

// Add a new component for database schema debugging
const DatabaseDebug: React.FC = () => {
  const [schemaInfo, setSchemaInfo] = useState<any>({});
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInfo() {
      try {
        setLoading(true);
        
        // Check schema information
        const { data: schemas, error: schemaError } = await supabase
          .rpc('get_schemas');
          
        if (schemaError) throw schemaError;
        
        // Try to get customers from different schemas
        const [publicCustomers, commonCustomers] = await Promise.all([
          supabase.from('customers').select('*'),
          supabase.schema('common').from('customers').select('*')
        ]);
        
        setSchemaInfo({
          schemas,
          publicCustomerError: publicCustomers.error?.message || null,
          commonCustomerError: commonCustomers.error?.message || null,
          publicCustomerCount: publicCustomers.data?.length || 0,
          commonCustomerCount: commonCustomers.data?.length || 0
        });
        
        // Set customers from common schema (which should be correct)
        setCustomers(commonCustomers.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadInfo();
  }, []);
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Database Schema Debug</h1>
      
      {loading ? (
        <p>Loading database information...</p>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          <h2 className="font-semibold">Error:</h2>
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Schema Information</h2>
            <pre className="p-4 bg-gray-100 rounded overflow-auto max-h-40">
              {JSON.stringify(schemaInfo, null, 2)}
            </pre>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-2">Customers ({customers.length})</h2>
            {customers.length === 0 ? (
              <p className="italic text-gray-500">No customers found in database.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customers.map(customer => (
                      <tr key={customer.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.company_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(customer.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  useEffect(() => {
    // Initialize custom roles
    initializeRoles().catch(err => {
      console.error('Failed to initialize roles:', err);
    });
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DivisionProvider>
            <ChatWindowProvider>
              <Router>
                <ScrollToTop />
                <Routes>
                  {/* === Core Routes === */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/" element={<Navigate to="/portal" replace />} />
                  <Route path="/portal" element={<RequireAuth><PortalLanding /></RequireAuth>} />
                  <Route path="/admin-dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
                  <Route path="/admin/encryption" element={<RequireAuth><Layout><EncryptionSettings /></Layout></RequireAuth>} />
                  <Route path="/profile-setup" element={<RequireAuth><ProfileSetup /></RequireAuth>} />
                  <Route path="/debug" element={<RequireAuth><Layout><DebugTableCheck /></Layout></RequireAuth>} />
                  <Route path="/chat-debug" element={<RequireAuth><Layout><ChatDebug /></Layout></RequireAuth>} />

                  {/* === HR Portal Route === */}
                  <Route path="/hr" element={<RequireAuth><Layout><HRPortal /></Layout></RequireAuth>} />

                  {/* === Office Administration Portal Route === */}
                  <Route path="/office" element={<RequireAuth><Layout><OfficeAdministrationPortal /></Layout></RequireAuth>} />

                  {/* === Lab Portal Routes === */}
                  <Route path="/lab" element={<RequireAuth><Layout><LabDashboard /></Layout></RequireAuth>} />
                  <Route path="/lab/equipment" element={<RequireAuth><Layout><EquipmentCalibration /></Layout></RequireAuth>} />
                  <Route path="/lab/procedures" element={<RequireAuth><Layout><TestingProcedures /></Layout></RequireAuth>} />
                  <Route path="/lab/certificates" element={<RequireAuth><Layout><CertificateGenerator /></Layout></RequireAuth>} />
                  <Route path="/lab/quality-metrics" element={<RequireAuth><Layout><QualityMetrics /></Layout></RequireAuth>} />
                  
                  {/* === Engineering Portal Routes === */}
                  <Route path="/engineering" element={<RequireAuth><Layout><EngineeringDashboard /></Layout></RequireAuth>} />
                  <Route path="/engineering/dashboard" element={<RequireAuth><Layout><EngineeringDashboard /></Layout></RequireAuth>} />
                  <Route path="/engineering/designs" element={<RequireAuth><Layout><DesignApprovalWorkflow /></Layout></RequireAuth>} />
                  <Route path="/engineering/documentation" element={<RequireAuth><Layout><TechnicalDocumentationLibrary /></Layout></RequireAuth>} />
                  <Route path="/engineering/standards" element={<RequireAuth><Layout><StandardsComplianceUpdates /></Layout></RequireAuth>} />
                  <Route path="/engineering/drawings" element={<RequireAuth><Layout><DrawingRepository /></Layout></RequireAuth>} />
                  
                  {/* === Sales Dashboard Routes === */}
                  <Route path="/sales-dashboard" element={<RequireAuth><SalesLayout><SalesDashboard /></SalesLayout></RequireAuth>} />
                  <Route path="/sales-dashboard/customers" element={<RequireAuth><SalesLayout><CustomerList /></SalesLayout></RequireAuth>} />
                  <Route path="/sales-dashboard/customers/:id" element={<RequireAuth><SalesLayout><CustomerDetail /></SalesLayout></RequireAuth>} />
                  <Route path="/sales-dashboard/contacts" element={<RequireAuth><SalesLayout><ContactList /></SalesLayout></RequireAuth>} />
                  <Route path="/sales-dashboard/contacts/:id" element={<RequireAuth><SalesLayout><ContactDetail /></SalesLayout></RequireAuth>} />
                  <Route path="/sales-dashboard/opportunities" element={<RequireAuth><SalesLayout><OpportunityList /></SalesLayout></RequireAuth>} />
                  <Route path="/sales-dashboard/opportunities/:id" element={<RequireAuth><SalesLayout><OpportunityDetail /></SalesLayout></RequireAuth>} />
                  <Route path="/sales-dashboard/customer-categories" element={<RequireAuth><SalesLayout><CustomerCategoriesPage /></SalesLayout></RequireAuth>} />
                  
                  {/* === Territory Management Routes === */}
                  <Route path="/territories" element={<RequireAuth><SalesLayout><TerritoryManagement /></SalesLayout></RequireAuth>} />
                  <Route path="/territories/:id/manage-sales-reps" element={<RequireAuth><SalesLayout><TerritoryManagement /></SalesLayout></RequireAuth>} />
                  <Route path="/territories/:id/performance" element={<RequireAuth><SalesLayout><TerritoryManagement /></SalesLayout></RequireAuth>} />
                  
                  {/* === Sales Goals Routes === */}
                  <Route path="/sales/goals" element={<RequireAuth><SalesLayout><GoalsPage /></SalesLayout></RequireAuth>} />
                  <Route path="/sales/goals/dashboard" element={<RequireAuth><SalesLayout><GoalsDashboardPage /></SalesLayout></RequireAuth>} />
                  <Route path="/sales/goals/new" element={<RequireAuth><SalesLayout><NewGoalPage /></SalesLayout></RequireAuth>} />
                  <Route path="/sales/goals/:id/edit" element={<RequireAuth><SalesLayout><EditGoalPage /></SalesLayout></RequireAuth>} />
                  <Route path="/sales/goals/management" element={<RequireAuth><SalesLayout><GoalManagementPage /></SalesLayout></RequireAuth>} />

                  {/* === Division-Specific Dashboard Routes === */}
                  {/* These specific routes should come before the generic /:division/dashboard route */}
                  <Route path="/north_alabama/dashboard" element={<RequireAuth><Layout><NorthAlabamaDashboard /></Layout></RequireAuth>} />
                  <Route path="/tennessee/dashboard" element={<RequireAuth><Layout><TennesseeDashboard /></Layout></RequireAuth>} />
                  <Route path="/georgia/dashboard" element={<RequireAuth><Layout><GeorgiaDashboard /></Layout></RequireAuth>} />
                  <Route path="/engineering/dashboard" element={<RequireAuth><Layout><EngineeringDashboard /></Layout></RequireAuth>} />
                  <Route path="/calibration/dashboard" element={<RequireAuth><Layout><CalibrationDashboard /></Layout></RequireAuth>} />
                  <Route path="/armadillo/dashboard" element={<RequireAuth><Layout><ArmadilloDashboard /></Layout></RequireAuth>} />
                  <Route path="/scavenger/dashboard" element={<RequireAuth><Layout><ScavengerDashboard /></Layout></RequireAuth>} />
                  
                  {/* Generic dashboard as fallback */}
                  <Route path="/:division/dashboard" element={<RequireAuth><Layout><Dashboard /></Layout></RequireAuth>} />
                  
                  {/* === Other Division-Specific Routes === */}
                  {/* Customers */}
                  <Route path="/:division/customers" element={<RequireAuth><Layout><CustomerList /></Layout></RequireAuth>} />
                  <Route path="/:division/customer-categories" element={<RequireAuth><Layout><CustomerCategoriesPage /></Layout></RequireAuth>} />
                  <Route path="/:division/customers/:id" element={<RequireAuth><Layout><CustomerDetail /></Layout></RequireAuth>} />
                  {/* Contacts */}
                  <Route path="/:division/contacts" element={<RequireAuth><Layout><ContactList /></Layout></RequireAuth>} />
                  <Route path="/:division/contacts/:id" element={<RequireAuth><Layout><ContactDetail /></Layout></RequireAuth>} />
                  {/* Scheduling */}
                  <Route path="/:division/scheduling" element={<RequireAuth><Layout><SchedulingPage /></Layout></RequireAuth>} />
                  {/* Equipment Management */}
                  <Route path="/:division/equipment" element={<RequireAuth><Layout><EquipmentPage /></Layout></RequireAuth>} />
                  {/* Equipment Maintenance */}
                  <Route path="/:division/maintenance" element={<RequireAuth><Layout><MaintenancePage /></Layout></RequireAuth>} />
                  {/* Technician Profiles */}
                  <Route path="/:division/profiles" element={<RequireAuth><Layout><TechnicianProfilesPage /></Layout></RequireAuth>} />
                  {/* Reports Management */}
                  <Route path="/:division/reports" element={<RequireAuth><Layout><ReportsPage /></Layout></RequireAuth>} />
                  {/* Resource Management */}
                  <Route path="/resources" element={<RequireAuth><Layout><ResourceManagement /></Layout></RequireAuth>} />
                  <Route path="/:division/resources" element={<RequireAuth><Layout><ResourceManagement /></Layout></RequireAuth>} />
                  {/* Jobs & Reports (now explicitly division-based or generic) */}
                  <Route path="/jobs" element={<RequireAuth><Layout><JobList /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id" element={<RequireAuth><Layout><JobDetail /></Layout></RequireAuth>} />
                  <Route path="/:division/jobs" element={<RequireAuth><Layout><JobList /></Layout></RequireAuth>} />
                  <Route path="/:division/jobs/:id" element={<RequireAuth><Layout><JobDetail /></Layout></RequireAuth>} />
                  
                  {/* Reports - Assuming they can be accessed generically or via division context in Layout */}
                  <Route path="/jobs/:id/switchgear-report/:reportId?" element={<RequireAuth><Layout><SwitchgearReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/panelboard-report/:reportId?" element={<RequireAuth><Layout><PanelboardReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/dry-type-transformer/:reportId?" element={<RequireAuth><Layout><DryTypeTransformerReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/large-dry-type-transformer/:reportId?" element={<RequireAuth><Layout><LargeDryTypeTransformerReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/liquid-filled-transformer/:reportId?" element={<RequireAuth><Layout><LiquidFilledTransformerReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/oil-inspection/:reportId?" element={<RequireAuth><Layout><OilInspectionReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/medium-voltage-switch-oil-report/:reportId?" element={<RequireAuth><Layout><MediumVoltageSwitchOilReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/low-voltage-cable-test-12sets/:reportId?" element={<RequireAuth><Layout><TwelveSetsLowVoltageCableTestForm /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/low-voltage-cable-test-20sets/:reportId?" element={<RequireAuth><Layout><TwentySetsLowVoltageCableTestForm /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/medium-voltage-vlf-tan-delta/:reportId?" element={<RequireAuth><Layout><TanDeltaChart /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/medium-voltage-vlf/:reportId?" element={<RequireAuth><Layout><MediumVoltageVLFReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/medium-voltage-cable-vlf-test/:reportId?" element={<RequireAuth><Layout><MediumVoltageCableVLFTest /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/metal-enclosed-busway/:reportId?" element={<RequireAuth><Layout><MetalEnclosedBuswayReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/low-voltage-switch-multi-device-test/:reportId?" element={<RequireAuth><Layout><LowVoltageSwitchWithPrint /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/low-voltage-switch-report/:reportId?" element={<RequireAuth><Layout><LowVoltageSwitchReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/mv-switch-oil/:reportId?" element={<RequireAuth><Layout><MediumVoltageSwitchOilReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/low-voltage-circuit-breaker-electronic-trip-ats-secondary-injection-report/:reportId?" element={<RequireAuth><Layout><LowVoltageCircuitBreakerElectronicTripATSSecondaryInjectionReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/low-voltage-circuit-breaker-electronic-trip-ats-report/:reportId?" element={<RequireAuth><Layout><LowVoltageCircuitBreakerElectronicTripATSReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/low-voltage-circuit-breaker-thermal-magnetic-ats-report/:reportId?" element={<RequireAuth><Layout><LowVoltageCircuitBreakerThermalMagneticATSReport /></Layout></RequireAuth>} />
                  <Route path="/jobs/:id/low-voltage-panelboard-small-breaker-report/:reportId?" element={<RequireAuth><Layout><LowVoltagePanelboardSmallBreakerTestATSReport /></Layout></RequireAuth>} />
                  
                  {/* NETA Testing Services Diagnostics */}
                  <Route path="/job-diagnostics" element={<RequireAuth><Layout><JobDiagnostics /></Layout></RequireAuth>} />
                  <Route path="/:division/job-diagnostics" element={<RequireAuth><Layout><JobDiagnostics /></Layout></RequireAuth>} />

                  {/* Add this to your routes */}
                  <Route path="/db-debug" element={<RequireAuth><Layout><DatabaseDebug /></Layout></RequireAuth>} />
                </Routes>
                
                {/* Persistent Chat Windows */}
                <ChatWindowManager />
              </Router>
            </ChatWindowProvider>
          </DivisionProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;