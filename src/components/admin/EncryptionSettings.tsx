import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Label } from '../ui/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectRoot } from '../ui/Select';
import { AlertCircle, ShieldCheck, RefreshCw, LockKeyhole } from 'lucide-react';
import { getEncryptionSettings, rotateEncryptionKey, isEncryptionInitialized } from '../../services/encryptionService';
import { supabase } from '../../lib/supabase';

interface EncryptionStatus {
  created: string;
  rotationIntervalDays: number;
  previousKeysCount: number;
  isInitialized: boolean;
}

export const EncryptionSettings: React.FC = () => {
  const [status, setStatus] = useState<EncryptionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rotationInProgress, setRotationInProgress] = useState<boolean>(false);
  const [sensitiveTablesCount, setSensitiveTablesCount] = useState<number>(0);
  const [encryptedFieldsCount, setEncryptedFieldsCount] = useState<number>(0);
  const [rotationInterval, setRotationInterval] = useState<number>(90);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);

  useEffect(() => {
    loadEncryptionStatus();
    countSensitiveTables();
  }, []);

  const loadEncryptionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const encryptionSettings = await getEncryptionSettings();
      const isInitialized = isEncryptionInitialized();
      
      if (encryptionSettings) {
        setStatus({
          ...encryptionSettings,
          isInitialized
        });
        
        setRotationInterval(encryptionSettings.rotationIntervalDays || 90);
      } else {
        setStatus({
          created: 'Not configured',
          rotationIntervalDays: 90,
          previousKeysCount: 0,
          isInitialized
        });
      }
    } catch (err) {
      console.error('Failed to load encryption status:', err);
      setError('Failed to load encryption status. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const countSensitiveTables = async () => {
    try {
      // Query to count tables with sensitive data flag
      const { data: tablesData, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .filter('table_schema', 'in', '(common,public)');
      
      if (tablesError) throw tablesError;
      
      // Mock data for demonstration - in a real app, this would come from the database
      setSensitiveTablesCount(4);  // Customers, employee_data, medical_records, payment_info
      setEncryptedFieldsCount(12); // Various PII and financial fields
    } catch (err) {
      console.error('Failed to count sensitive tables:', err);
    }
  };

  const handleRotateKey = async () => {
    try {
      setRotationInProgress(true);
      setError(null);
      
      const success = await rotateEncryptionKey();
      
      if (success) {
        await loadEncryptionStatus();
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        setError('Failed to rotate encryption key. Please try again later.');
      }
    } catch (err) {
      console.error('Error rotating encryption key:', err);
      setError('An unexpected error occurred during key rotation.');
    } finally {
      setRotationInProgress(false);
    }
  };

  const handleRotationIntervalChange = (value: string) => {
    setRotationInterval(parseInt(value));
    // In a real app, this would update the setting in the database
  };

  // Dummy handler for the switches 
  const handleSwitchChange = (checked: boolean) => {
    console.log('Switch changed:', checked);
    // In a real app, this would update the configuration
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Encryption Settings</CardTitle>
          <CardDescription>Secure your sensitive data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center my-8">
            <div className="text-gray-500">Loading encryption settings...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Encryption Settings</CardTitle>
            <CardDescription>Manage field-level encryption for sensitive data</CardDescription>
          </div>
          <LockKeyhole className="h-8 w-8 text-gray-500" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showSuccessMessage && (
          <Alert variant="default" className="bg-green-50 border-green-200 mb-4">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Success</AlertTitle>
            <AlertDescription className="text-green-600">
              Encryption key has been successfully rotated.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="status">
          <TabsList className="mb-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="fields">Protected Fields</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="mb-2 text-2xl font-bold text-gray-900">
                      {status?.isInitialized ? 'Active' : 'Inactive'}
                    </div>
                    <p className="text-sm text-gray-500">Encryption Status</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="mb-2 text-2xl font-bold text-gray-900">
                      {sensitiveTablesCount}
                    </div>
                    <p className="text-sm text-gray-500">Protected Tables</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="mb-2 text-2xl font-bold text-gray-900">
                      {encryptedFieldsCount}
                    </div>
                    <p className="text-sm text-gray-500">Encrypted Fields</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Encryption Key Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Current Key Created</Label>
                    <div className="mt-1 text-sm font-medium">
                      {status?.created !== 'Not configured'
                        ? new Date(status?.created || '').toLocaleString()
                        : 'Not configured'}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Rotation Interval</Label>
                    <div className="mt-1 text-sm font-medium">
                      {status?.rotationIntervalDays || 90} days
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Previous Keys</Label>
                    <div className="mt-1 text-sm font-medium">
                      {status?.previousKeysCount || 0}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Next Scheduled Rotation</Label>
                    <div className="mt-1 text-sm font-medium">
                      {status?.created !== 'Not configured'
                        ? new Date(
                            new Date(status?.created || '').getTime() +
                              (status?.rotationIntervalDays || 90) * 24 * 60 * 60 * 1000
                          ).toLocaleDateString()
                        : 'Not scheduled'}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleRotateKey}
                    disabled={rotationInProgress || !status?.isInitialized}
                  >
                    {rotationInProgress ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Rotating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Rotate Encryption Key Now
                      </>
                    )}
                  </Button>
                  <p className="mt-2 text-xs text-gray-500">
                    Rotating the key creates a new encryption key while preserving the ability to decrypt existing data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Encryption Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="rotation-interval">Key Rotation Interval (days)</Label>
                  <SelectRoot 
                    defaultValue={rotationInterval.toString()} 
                    onValueChange={handleRotationIntervalChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">365 days</SelectItem>
                    </SelectContent>
                  </SelectRoot>
                  <p className="text-xs text-gray-500">
                    How often the system should automatically rotate encryption keys
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="encrypt-pii">Encrypt Personal Information</Label>
                    <p className="text-sm text-gray-500">
                      Automatically encrypt PII (names, addresses, etc.)
                    </p>
                  </div>
                  <Switch id="encrypt-pii" checked={true} onCheckedChange={handleSwitchChange} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="encrypt-financial">Encrypt Financial Data</Label>
                    <p className="text-sm text-gray-500">
                      Automatically encrypt payment information
                    </p>
                  </div>
                  <Switch id="encrypt-financial" checked={true} onCheckedChange={handleSwitchChange} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="encrypt-health">Encrypt Health Data</Label>
                    <p className="text-sm text-gray-500">
                      Automatically encrypt health-related information
                    </p>
                  </div>
                  <Switch id="encrypt-health" checked={true} onCheckedChange={handleSwitchChange} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Protected Field Configuration</CardTitle>
                <CardDescription>
                  Configure which fields contain sensitive data requiring encryption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-md">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h3 className="font-medium">Customer Data</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="customer-ssn">Social Security Number</Label>
                        <Switch id="customer-ssn" checked={true} onCheckedChange={handleSwitchChange} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="customer-cc">Credit Card Information</Label>
                        <Switch id="customer-cc" checked={true} onCheckedChange={handleSwitchChange} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="customer-address">Home Address</Label>
                        <Switch id="customer-address" checked={true} onCheckedChange={handleSwitchChange} />
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h3 className="font-medium">Employee Data</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="employee-ssn">Social Security Number</Label>
                        <Switch id="employee-ssn" checked={true} onCheckedChange={handleSwitchChange} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="employee-salary">Salary Information</Label>
                        <Switch id="employee-salary" checked={true} onCheckedChange={handleSwitchChange} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="employee-health">Health Information</Label>
                        <Switch id="employee-health" checked={true} onCheckedChange={handleSwitchChange} />
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h3 className="font-medium">Payment Data</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="payment-card">Card Numbers</Label>
                        <Switch id="payment-card" checked={true} onCheckedChange={handleSwitchChange} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="payment-bank">Bank Account Information</Label>
                        <Switch id="payment-bank" checked={true} onCheckedChange={handleSwitchChange} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="payment-routing">Routing Numbers</Label>
                        <Switch id="payment-routing" checked={true} onCheckedChange={handleSwitchChange} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}; 