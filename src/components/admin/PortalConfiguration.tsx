import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, Settings, Globe, Moon, Sun, PanelLeft, BookOpen, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Switch } from '../ui/Switch';
import { Input } from '../ui/Input';
import { SelectRoot, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Label } from '../ui/Label';
import { Slider } from '../ui/Slider';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { toast } from 'react-hot-toast';

interface PortalConfig {
  theme: {
    mode: 'light' | 'dark' | 'system';
    primaryColor: string;
    accentColor: string;
    sidebarVisible: boolean;
    compactMode: boolean;
  };
  features: {
    analyticsEnabled: boolean;
    documentationEnabled: boolean;
    notificationsEnabled: boolean;
    feedbackEnabled: boolean;
    chatEnabled: boolean;
  };
  security: {
    sessionTimeout: number;
    inactivityLogout: boolean;
    passwordExpiry: number;
    mfaRequired: boolean;
  };
  content: {
    welcomeMessage: string;
    footerText: string;
    termsUrl: string;
    privacyUrl: string;
    helpUrl: string;
  };
}

export const PortalConfiguration: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PortalConfig>({
    theme: {
      mode: 'system',
      primaryColor: '#f26722',
      accentColor: '#4338ca',
      sidebarVisible: true,
      compactMode: false,
    },
    features: {
      analyticsEnabled: true,
      documentationEnabled: true,
      notificationsEnabled: true,
      feedbackEnabled: true,
      chatEnabled: false,
    },
    security: {
      sessionTimeout: 30,
      inactivityLogout: true,
      passwordExpiry: 90,
      mfaRequired: false,
    },
    content: {
      welcomeMessage: 'Welcome to the portal dashboard',
      footerText: '© 2023 Active Website Software',
      termsUrl: '/terms',
      privacyUrl: '/privacy',
      helpUrl: '/help',
    },
  });

  const fetchConfiguration = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API request with a delay
      setTimeout(() => {
        // In a real app, you would fetch from your database
        // const { data, error } = await supabase.from('portal_config').select('*').single();
        // if (error) throw error;
        // setConfig(data);
        setLoading(false);
      }, 1000);
    } catch (err: any) {
      console.error("Error fetching portal configuration:", err);
      setError(`Failed to load configuration: ${err.message}`);
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // Simulate API request with a delay
      setTimeout(() => {
        // In a real app, you would update your database
        // const { error } = await supabase.from('portal_config').upsert(config);
        // if (error) throw error;
        toast.success('Portal configuration saved successfully');
        setSaving(false);
      }, 1500);
    } catch (err: any) {
      console.error("Error saving portal configuration:", err);
      toast.error(`Failed to save configuration: ${err.message}`);
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchConfiguration();
  }, []);

  const handleThemeChange = (key: keyof PortalConfig['theme'], value: any) => {
    setConfig({
      ...config,
      theme: {
        ...config.theme,
        [key]: value,
      },
    });
  };

  const handleFeaturesChange = (key: keyof PortalConfig['features'], value: boolean) => {
    setConfig({
      ...config,
      features: {
        ...config.features,
        [key]: value,
      },
    });
  };

  const handleSecurityChange = (key: keyof PortalConfig['security'], value: any) => {
    setConfig({
      ...config,
      security: {
        ...config.security,
        [key]: value,
      },
    });
  };

  const handleContentChange = (key: keyof PortalConfig['content'], value: string) => {
    setConfig({
      ...config,
      content: {
        ...config.content,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Portal Configuration</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Customize the appearance and functionality of the portals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchConfiguration}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={saveConfiguration}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-4">
            <TabsTrigger value="theme" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span>Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span>Features</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>Content</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>Customize the look and feel of the portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme-mode">Theme Mode</Label>
                  <SelectRoot
                    value={config.theme.mode}
                    onValueChange={(value) => handleThemeChange('mode', value)}
                  >
                    <SelectTrigger id="theme-mode">
                      <SelectValue placeholder="Select theme mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light" className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          <span>Light</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          <span>Dark</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <span>System Default</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </SelectRoot>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primary-color"
                      type="color"
                      value={config.theme.primaryColor}
                      onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      type="text"
                      value={config.theme.primaryColor}
                      onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                      className="flex-grow"
                    />
                    <div 
                      className="h-8 w-8 rounded border" 
                      style={{ backgroundColor: config.theme.primaryColor }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="accent-color"
                      type="color"
                      value={config.theme.accentColor}
                      onChange={(e) => handleThemeChange('accentColor', e.target.value)}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      type="text"
                      value={config.theme.accentColor}
                      onChange={(e) => handleThemeChange('accentColor', e.target.value)}
                      className="flex-grow"
                    />
                    <div 
                      className="h-8 w-8 rounded border" 
                      style={{ backgroundColor: config.theme.accentColor }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sidebar-visible">Sidebar Visible</Label>
                    <p className="text-sm text-gray-500">Show sidebar navigation by default</p>
                  </div>
                  <Switch
                    id="sidebar-visible"
                    checked={config.theme.sidebarVisible}
                    onCheckedChange={(checked) => handleThemeChange('sidebarVisible', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="compact-mode">Compact Mode</Label>
                    <p className="text-sm text-gray-500">Use more condensed layouts</p>
                  </div>
                  <Switch
                    id="compact-mode"
                    checked={config.theme.compactMode}
                    onCheckedChange={(checked) => handleThemeChange('compactMode', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Settings</CardTitle>
                <CardDescription>Enable or disable portal features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analytics-enabled">Analytics</Label>
                    <p className="text-sm text-gray-500">Enable usage analytics and tracking</p>
                  </div>
                  <Switch
                    id="analytics-enabled"
                    checked={config.features.analyticsEnabled}
                    onCheckedChange={(checked) => handleFeaturesChange('analyticsEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="documentation-enabled">Documentation</Label>
                    <p className="text-sm text-gray-500">Enable access to documentation and help resources</p>
                  </div>
                  <Switch
                    id="documentation-enabled"
                    checked={config.features.documentationEnabled}
                    onCheckedChange={(checked) => handleFeaturesChange('documentationEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications-enabled">Notifications</Label>
                    <p className="text-sm text-gray-500">Enable in-app notifications</p>
                  </div>
                  <Switch
                    id="notifications-enabled"
                    checked={config.features.notificationsEnabled}
                    onCheckedChange={(checked) => handleFeaturesChange('notificationsEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="feedback-enabled">Feedback</Label>
                    <p className="text-sm text-gray-500">Allow users to submit feedback</p>
                  </div>
                  <Switch
                    id="feedback-enabled"
                    checked={config.features.feedbackEnabled}
                    onCheckedChange={(checked) => handleFeaturesChange('feedbackEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="chat-enabled">Support Chat</Label>
                    <p className="text-sm text-gray-500">Enable support chat functionality</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200">
                      Beta
                    </Badge>
                    <Switch
                      id="chat-enabled"
                      checked={config.features.chatEnabled}
                      onCheckedChange={(checked) => handleFeaturesChange('chatEnabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure security options for the portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <span className="text-sm font-medium">{config.security.sessionTimeout} min</span>
                  </div>
                  <Slider
                    min={5}
                    max={120}
                    step={5}
                    value={config.security.sessionTimeout}
                    onChange={(value) => handleSecurityChange('sessionTimeout', value)}
                  />
                  <p className="text-xs text-gray-500">
                    How long until user sessions expire due to inactivity
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="inactivity-logout">Inactivity Logout</Label>
                    <p className="text-sm text-gray-500">Automatically log out inactive users</p>
                  </div>
                  <Switch
                    id="inactivity-logout"
                    checked={config.security.inactivityLogout}
                    onCheckedChange={(checked) => handleSecurityChange('inactivityLogout', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password-expiry">Password Expiry (days)</Label>
                    <span className="text-sm font-medium">{config.security.passwordExpiry} days</span>
                  </div>
                  <SelectRoot
                    value={config.security.passwordExpiry.toString()}
                    onValueChange={(value) => handleSecurityChange('passwordExpiry', parseInt(value))}
                  >
                    <SelectTrigger id="password-expiry">
                      <SelectValue placeholder="Select expiry period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </SelectRoot>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="mfa-required">Require Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">Require MFA for all users</p>
                  </div>
                  <Switch
                    id="mfa-required"
                    checked={config.security.mfaRequired}
                    onCheckedChange={(checked) => handleSecurityChange('mfaRequired', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Settings</CardTitle>
                <CardDescription>Configure text content and links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="welcome-message">Welcome Message</Label>
                  <Textarea
                    id="welcome-message"
                    value={config.content.welcomeMessage}
                    onChange={(e) => handleContentChange('welcomeMessage', e.target.value)}
                    placeholder="Enter welcome message"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500">
                    Message displayed to users on the dashboard
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer-text">Footer Text</Label>
                  <Input
                    id="footer-text"
                    value={config.content.footerText}
                    onChange={(e) => handleContentChange('footerText', e.target.value)}
                    placeholder="Enter footer text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms-url">Terms of Service URL</Label>
                  <Input
                    id="terms-url"
                    value={config.content.termsUrl}
                    onChange={(e) => handleContentChange('termsUrl', e.target.value)}
                    placeholder="Enter terms URL"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="privacy-url">Privacy Policy URL</Label>
                  <Input
                    id="privacy-url"
                    value={config.content.privacyUrl}
                    onChange={(e) => handleContentChange('privacyUrl', e.target.value)}
                    placeholder="Enter privacy policy URL"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="help-url">Help & Support URL</Label>
                  <Input
                    id="help-url"
                    value={config.content.helpUrl}
                    onChange={(e) => handleContentChange('helpUrl', e.target.value)}
                    placeholder="Enter help URL"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default PortalConfiguration; 