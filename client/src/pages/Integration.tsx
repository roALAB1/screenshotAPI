import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLoginUrl } from "@/const";
import { Bug, ArrowLeft, Copy, Code, Zap, Settings } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function Integration() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const projectKeyParam = searchParams.get("projectKey");

  const { data: projects, isLoading } = trpc.projects.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [selectedProjectKey, setSelectedProjectKey] = useState(projectKeyParam || "");

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const apiEndpoint = typeof window !== "undefined" ? window.location.origin : "";

  const scriptCode = `<!-- Bug Capture SDK -->
<script src="${apiEndpoint}/sdk/bug-capture.js"></script>
<script>
  BugCapture.init({
    projectKey: "${selectedProjectKey || "YOUR_PROJECT_KEY"}",
    apiEndpoint: "${apiEndpoint}",
    // Optional: Show floating capture button
    showButton: true,
    // Optional: Button position
    buttonPosition: "bottom-right",
  });
</script>`;

  const npmCode = `// Install via npm (coming soon)
// npm install @bug-capture/sdk

import { BugCapture } from "@bug-capture/sdk";

const bugCapture = new BugCapture({
  projectKey: "${selectedProjectKey || "YOUR_PROJECT_KEY"}",
  apiEndpoint: "${apiEndpoint}",
});

// Initialize on app start
bugCapture.init();

// Manually trigger capture
document.getElementById("report-bug").addEventListener("click", async () => {
  const data = await bugCapture.getCaptureData();
  await bugCapture.submit({
    ...data,
    title: "User reported bug",
    description: "Description from user",
  });
});`;

  const apiCode = `// Direct API Integration
const captureData = {
  projectKey: "${selectedProjectKey || "YOUR_PROJECT_KEY"}",
  title: "Bug Report Title",
  description: "Description of the issue",
  pageUrl: window.location.href,
  screenshot: "data:image/png;base64,...", // Base64 encoded screenshot
  consoleLogs: [
    { type: "error", message: "Error message", timestamp: Date.now() }
  ],
  networkLogs: [
    { method: "GET", url: "/api/data", status: 500, duration: 100, size: 0, type: "json" }
  ],
  deviceInfo: {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookiesEnabled: navigator.cookieEnabled,
  },
  reporterEmail: "user@example.com", // Optional
  reporterName: "John Doe", // Optional
};

// Submit via tRPC API
fetch("${apiEndpoint}/api/trpc/bugReports.submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ json: captureData }),
});`;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Bug className="w-12 h-12 mx-auto mb-4 text-primary" />
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view integration guide</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">SDK Integration</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
            <CardDescription>
              Choose a project to get the integration code with the correct project key
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : projects && projects.length > 0 ? (
              <Select value={selectedProjectKey} onValueChange={setSelectedProjectKey}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.projectKey}>
                      {project.name} ({project.projectKey})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">No projects yet. Create one first.</p>
                <Button asChild>
                  <Link href="/projects">Create Project</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integration Options */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Methods</CardTitle>
            <CardDescription>
              Choose the integration method that works best for your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="script">
              <TabsList className="mb-4">
                <TabsTrigger value="script" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Script Tag
                </TabsTrigger>
                <TabsTrigger value="npm" className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  NPM Package
                </TabsTrigger>
                <TabsTrigger value="api" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Direct API
                </TabsTrigger>
              </TabsList>

              <TabsContent value="script">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Quick Start (Recommended)</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Add this script tag to your HTML to enable bug capture with a floating button.
                      Users can click the button to capture and submit bug reports.
                    </p>
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{scriptCode}</code>
                    </pre>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode(scriptCode)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Features</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Automatic console log capture</li>
                      <li>• Network request monitoring</li>
                      <li>• Screenshot capture on demand</li>
                      <li>• User action tracking (clicks, inputs)</li>
                      <li>• Device and browser information</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="npm">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">NPM Package (Coming Soon)</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      For React, Vue, or other framework applications, you can use our NPM package
                      for more control over the capture process.
                    </p>
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{npmCode}</code>
                    </pre>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode(npmCode)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="api">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Direct API Integration</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      For custom implementations, you can directly call our API to submit bug reports.
                    </p>
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{apiCode}</code>
                    </pre>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode(apiCode)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Configuration Options */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Configuration Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Option</th>
                    <th className="text-left py-2 px-4">Type</th>
                    <th className="text-left py-2 px-4">Default</th>
                    <th className="text-left py-2 px-4">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">projectKey</td>
                    <td className="py-2 px-4">string</td>
                    <td className="py-2 px-4">required</td>
                    <td className="py-2 px-4">Your project's unique key</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">apiEndpoint</td>
                    <td className="py-2 px-4">string</td>
                    <td className="py-2 px-4">required</td>
                    <td className="py-2 px-4">Bug Capture API URL</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">showButton</td>
                    <td className="py-2 px-4">boolean</td>
                    <td className="py-2 px-4">true</td>
                    <td className="py-2 px-4">Show floating capture button</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">buttonPosition</td>
                    <td className="py-2 px-4">string</td>
                    <td className="py-2 px-4">"bottom-right"</td>
                    <td className="py-2 px-4">Button position (bottom-right, bottom-left, top-right, top-left)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">captureConsole</td>
                    <td className="py-2 px-4">boolean</td>
                    <td className="py-2 px-4">true</td>
                    <td className="py-2 px-4">Capture console logs</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">captureNetwork</td>
                    <td className="py-2 px-4">boolean</td>
                    <td className="py-2 px-4">true</td>
                    <td className="py-2 px-4">Capture network requests</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-mono">maxConsoleLogs</td>
                    <td className="py-2 px-4">number</td>
                    <td className="py-2 px-4">100</td>
                    <td className="py-2 px-4">Maximum console logs to store</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
