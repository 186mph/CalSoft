import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Lock, Boxes, FileText, ShieldCheck, CheckSquare, CloudLightning, BookOpen, Link as LinkIcon } from 'lucide-react';

export default function ResourcesPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Resources</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left: Section tabs */}
        <div className="md:col-span-1">
          <Card className="bg-white dark:bg-dark-150 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-sm text-gray-700 dark:text-gray-300">Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="passwords" orientation="vertical" className="w-full">
                <TabsList className="flex flex-col items-stretch gap-2 bg-transparent p-0">
                  <TabsTrigger value="passwords" className="justify-start">
                    <Lock className="mr-2 h-4 w-4" /> Passwords
                  </TabsTrigger>
                  <TabsTrigger value="supplies" className="justify-start">
                    <Boxes className="mr-2 h-4 w-4" /> Supplies & Materials
                  </TabsTrigger>
                  <TabsTrigger value="dot" className="justify-start">
                    <FileText className="mr-2 h-4 w-4" /> DOT Inspection Form
                  </TabsTrigger>
                  <TabsTrigger value="ppe" className="justify-start">
                    <ShieldCheck className="mr-2 h-4 w-4" /> Rubber PPE Test Cycle
                  </TabsTrigger>
                  <TabsTrigger value="processes" className="justify-start">
                    <CheckSquare className="mr-2 h-4 w-4" /> Processes
                  </TabsTrigger>
                  <TabsTrigger value="storm" className="justify-start">
                    <CloudLightning className="mr-2 h-4 w-4" /> Storm Watch
                  </TabsTrigger>
                  <TabsTrigger value="manuals" className="justify-start">
                    <BookOpen className="mr-2 h-4 w-4" /> Manuals
                  </TabsTrigger>
                  <TabsTrigger value="links" className="justify-start">
                    <LinkIcon className="mr-2 h-4 w-4" /> Links
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right: Content */}
        <div className="md:col-span-3">
          <Tabs defaultValue="passwords" className="w-full">
            <TabsContent value="passwords">
              <Card className="bg-white dark:bg-dark-150 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center"><Lock className="mr-2 h-5 w-5" /> Passwords</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <p>Store and access company credentials securely. Integrate with your preferred vault (1Password/Bitwarden/LastPass).</p>
                  <div className="flex gap-2">
                    <Button asChild size="sm">
                      <a href="#" target="_blank" rel="noreferrer">Open Vault</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="supplies">
              <Card className="bg-white dark:bg-dark-150 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center"><Boxes className="mr-2 h-5 w-5" /> Supplies & Materials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ul className="list-disc ml-5 space-y-1">
                    <li><a className="link-primary" href="#" target="_blank" rel="noreferrer">Order Form</a></li>
                    <li><a className="link-primary" href="#" target="_blank" rel="noreferrer">Approved Vendors</a></li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dot">
              <Card className="bg-white dark:bg-dark-150 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5" /> DOT Inspection Form</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <a href="/dot-inspec.html" target="_blank" rel="noreferrer">Open DOT Form</a>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ppe">
              <Card className="bg-white dark:bg-dark-150 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5" /> Rubber PPE Test Cycle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Guidance and schedule for PPE testing.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="processes">
              <Card className="bg-white dark:bg-dark-150 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center"><CheckSquare className="mr-2 h-5 w-5" /> Processes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ul className="list-disc ml-5 space-y-1">
                    <li><a className="link-primary" href="#" target="_blank" rel="noreferrer">Onboarding</a></li>
                    <li><a className="link-primary" href="#" target="_blank" rel="noreferrer">Safety Checklist</a></li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="storm">
              <Card className="bg-white dark:bg-dark-150 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center"><CloudLightning className="mr-2 h-5 w-5" /> Storm Watch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Links and procedures for storm response readiness.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manuals">
              <Card className="bg-white dark:bg-dark-150 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5" /> Manuals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ul className="list-disc ml-5 space-y-1">
                    <li><a className="link-primary" href="#" target="_blank" rel="noreferrer">Company Handbook</a></li>
                    <li><a className="link-primary" href="#" target="_blank" rel="noreferrer">Equipment Manuals</a></li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="links">
              <Card className="bg-white dark:bg-dark-150 border border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5" /> Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <ul className="list-disc ml-5 space-y-1">
                    <li><a className="link-primary" href="#" target="_blank" rel="noreferrer">SharePoint</a></li>
                    <li><a className="link-primary" href="#" target="_blank" rel="noreferrer">Google Drive</a></li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}


