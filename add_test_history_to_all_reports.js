// Script to add test history sections to all calibration reports
// This is a reference for manual implementation

const reports = [
  'CalibrationLineHoseReport.tsx',
  'CalibrationHotstickReport.tsx', 
  'CalibrationGroundCableReport.tsx',
  'CalibrationBucketTruckReport.tsx'
];

// For each report, add these sections:

// 1. Add interfaces after existing interfaces:
`
// Add these interfaces after the existing interfaces
interface [ReportType]TestHistory {
  id: string;
  [report_type]_report_id: string;
  test_result: 'PASS' | 'FAIL';
  tested_by: string;
  test_notes?: string;
  test_date: string;
  created_at: string;
}

interface TestHistoryEntry {
  id: string;
  test_date: string;
  test_result: 'PASS' | 'FAIL';
  tested_by_email: string;
  test_notes?: string;
}
`

// 2. Add state variables after existing state:
`
const [testHistory, setTestHistory] = useState<TestHistoryEntry[]>([]);
const [loadingTestHistory, setLoadingTestHistory] = useState(false);
const [isSaving, setIsSaving] = useState(false);
`

// 3. Add test history functions:
`
// Test History functions
const loadTestHistory = async (reportId: string) => {
  if (!reportId) return;
  
  try {
    setLoadingTestHistory(true);
    const { data, error } = await supabase
      .schema('lab_ops')
      .from('[report_type]_test_history')
      .select(\`
        id,
        test_date,
        test_result,
        tested_by,
        test_notes,
        created_at
      \`)
      .eq('[report_type]_report_id', reportId)
      .order('test_date', { ascending: false });

    if (error) throw error;

    if (data) {
      const historyWithNames: TestHistoryEntry[] = data.map(entry => ({
        id: entry.id,
        test_date: entry.test_date,
        test_result: entry.test_result,
        tested_by_email: \`User \${entry.tested_by?.slice(0, 8)}...\` || 'Unknown User',
        test_notes: entry.test_notes
      }));

      setTestHistory(historyWithNames);
    }
  } catch (error) {
    console.error('Error loading test history:', error);
    setError(\`Failed to load test history: \${(error as Error).message}\`);
  } finally {
    setLoadingTestHistory(false);
  }
};

const addTestHistoryEntry = async (testResult: 'PASS' | 'FAIL', notes?: string) => {
  if (!reportId || !user?.id) {
    console.warn('Cannot add test history entry: missing reportId or user.id', { reportId, userId: user?.id });
    return;
  }

  try {
    console.log('Adding test history entry:', { reportId, testResult, userId: user.id, notes });
    
    const { data, error } = await supabase
      .schema('lab_ops')
      .from('[report_type]_test_history')
      .insert({
        [report_type]_report_id: reportId,
        test_result: testResult,
        tested_by: user.id,
        test_notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error adding test history:', error);
      throw error;
    }

    console.log('Successfully added test history entry:', data);

    const userName = user.email || \`User \${user.id.slice(0, 8)}...\`;

    const newEntry: TestHistoryEntry = {
      id: data.id,
      test_date: data.test_date,
      test_result: data.test_result,
      tested_by_email: userName,
      test_notes: data.test_notes
    };

    setTestHistory(prev => [newEntry, ...prev]);
  } catch (error) {
    console.error('Error adding test history entry:', error);
    setError(\`Failed to add test history entry: \${(error as Error).message}\`);
  }
};
`

// 4. Update useEffect to load test history:
`
useEffect(() => { 
  const fetchData = async () => { 
    await loadJobInfo(); 
    await loadReport(); 
    
    // Load test history if report exists
    if (reportId) {
      await loadTestHistory(reportId);
    }
  }; 
  fetchData(); 
}, [jobId, reportId]);
`

// 5. Update handleSave to call addTestHistoryEntry:
`
setLoading(false);
toast.success(reportId ? 'Report updated!' : 'Report saved!');

// Add test history entry
await addTestHistoryEntry(status);
`

// 6. Add test history UI section before closing div:
`
{/* Test History */}
{reportId && (
  <div className="bg-white dark:bg-dark-150 rounded-lg shadow p-6">
    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">
      Test History
    </h2>
    {loadingTestHistory ? (
      <div className="text-center py-4">
        <div className="text-gray-500 dark:text-gray-400">Loading test history...</div>
      </div>
    ) : testHistory.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-dark-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Test Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Result
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Tested By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-150 divide-y divide-gray-200 dark:divide-gray-700">
            {testHistory.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-dark-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {new Date(entry.test_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={\`px-2 inline-flex text-xs leading-5 font-semibold rounded-full \${
                    entry.test_result === 'PASS' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }\`}>
                    {entry.test_result}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {entry.tested_by_email}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {entry.test_notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-center py-4">
        <div className="text-gray-500 dark:text-gray-400">No test history available</div>
      </div>
    )}
  </div>
)}
`

console.log('Test history sections need to be added to:', reports); 