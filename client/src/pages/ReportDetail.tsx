import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bug,
  ArrowLeft,
  Monitor,
  Globe,
  Clock,
  Terminal,
  Network,
  MousePointer,
  Image,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

const statusColors = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const consoleIcons = {
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
  warn: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
  log: <Terminal className="w-4 h-4 text-gray-500" />,
  debug: <CheckCircle className="w-4 h-4 text-gray-400" />,
};

const consoleColors = {
  error: "bg-red-50 border-red-200 text-red-800",
  warn: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  log: "bg-gray-50 border-gray-200 text-gray-800",
  debug: "bg-gray-50 border-gray-200 text-gray-600",
};

export default function ReportDetail() {
  const params = useParams<{ id: string }>();
  const reportId = parseInt(params.id || "0");
  const utils = trpc.useUtils();

  const { data: report, isLoading } = trpc.bugReports.get.useQuery(
    { id: reportId },
    { enabled: reportId > 0 }
  );

  const updateReport = trpc.bugReports.update.useMutation({
    onSuccess: () => {
      utils.bugReports.get.invalidate({ id: reportId });
      toast.success("Report updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Bug className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">Report Not Found</h3>
            <Button asChild className="mt-4">
              <Link href="/reports">Back to Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const consoleLogs = (report.consoleLogs as any[]) || [];
  const networkLogs = (report.networkLogs as any[]) || [];
  const userActions = (report.userActions as any[]) || [];
  const deviceInfo = report.deviceInfo as any;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/reports">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <Bug className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold truncate max-w-md">
                {report.title || "Untitled Bug Report"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={report.status}
                onValueChange={(value) =>
                  updateReport.mutate({ id: reportId, status: value as any })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={report.priority}
                onValueChange={(value) =>
                  updateReport.mutate({ id: reportId, priority: value as any })
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Screenshot */}
            {report.screenshotUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Screenshot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a href={report.screenshotUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={report.screenshotUrl}
                      alt="Bug Screenshot"
                      className="w-full rounded border hover:opacity-90 transition-opacity"
                    />
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Report Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <Badge className={statusColors[report.status]}>
                    {report.status.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Priority</p>
                  <Badge className={priorityColors[report.priority]}>{report.priority}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Page URL</p>
                  <a
                    href={report.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3 flex-shrink-0" />
                    {report.pageUrl}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reported</p>
                  <p className="text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
                {report.reporterEmail && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Reporter</p>
                    <p className="text-sm">
                      {report.reporterName || "Unknown"} ({report.reporterEmail})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Device Info */}
            {deviceInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Device Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Platform</span>
                    <span>{deviceInfo.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Screen</span>
                    <span>
                      {deviceInfo.screenWidth}x{deviceInfo.screenHeight}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Viewport</span>
                    <span>
                      {deviceInfo.viewportWidth}x{deviceInfo.viewportHeight}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pixel Ratio</span>
                    <span>{deviceInfo.devicePixelRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Language</span>
                    <span>{deviceInfo.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Timezone</span>
                    <span>{deviceInfo.timezone}</span>
                  </div>
                  {deviceInfo.userAgent && (
                    <div>
                      <p className="text-gray-500 mb-1">User Agent</p>
                      <p className="text-xs break-all bg-gray-100 p-2 rounded">
                        {deviceInfo.userAgent}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Logs */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <Tabs defaultValue="console" className="h-full">
                <CardHeader className="pb-0">
                  <TabsList>
                    <TabsTrigger value="console" className="flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      Console ({consoleLogs.length})
                    </TabsTrigger>
                    <TabsTrigger value="network" className="flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      Network ({networkLogs.length})
                    </TabsTrigger>
                    <TabsTrigger value="actions" className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4" />
                      Actions ({userActions.length})
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-4">
                  <TabsContent value="console" className="mt-0">
                    <ScrollArea className="h-[600px]">
                      {consoleLogs.length > 0 ? (
                        <div className="space-y-2">
                          {consoleLogs.map((log, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded border ${consoleColors[log.type as keyof typeof consoleColors] || consoleColors.log}`}
                            >
                              <div className="flex items-start gap-2">
                                {consoleIcons[log.type as keyof typeof consoleIcons] || consoleIcons.log}
                                <div className="flex-1 min-w-0">
                                  <pre className="text-sm whitespace-pre-wrap break-all font-mono">
                                    {log.message}
                                  </pre>
                                  {log.stack && (
                                    <pre className="text-xs mt-2 text-gray-500 whitespace-pre-wrap break-all">
                                      {log.stack}
                                    </pre>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No console logs captured</p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="network" className="mt-0">
                    <ScrollArea className="h-[600px]">
                      {networkLogs.length > 0 ? (
                        <div className="space-y-2">
                          {networkLogs.map((req, index) => (
                            <div key={index} className="p-3 rounded border bg-gray-50">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant={req.status >= 400 ? "destructive" : "secondary"}
                                  className="font-mono"
                                >
                                  {req.status || "ERR"}
                                </Badge>
                                <Badge variant="outline" className="font-mono">
                                  {req.method}
                                </Badge>
                                <span className="text-sm truncate flex-1">{req.url}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{Math.round(req.duration)}ms</span>
                                <span>{(req.size / 1024).toFixed(2)} KB</span>
                                <span>{req.type}</span>
                              </div>
                              {req.responseBody && req.responseBody.length < 500 && (
                                <details className="mt-2">
                                  <summary className="text-xs text-gray-500 cursor-pointer">
                                    Response Preview
                                  </summary>
                                  <pre className="text-xs mt-1 p-2 bg-white rounded border overflow-auto max-h-32">
                                    {req.responseBody}
                                  </pre>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No network requests captured</p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="actions" className="mt-0">
                    <ScrollArea className="h-[600px]">
                      {userActions.length > 0 ? (
                        <div className="space-y-2">
                          {userActions.map((action, index) => (
                            <div key={index} className="p-3 rounded border bg-gray-50">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{action.action}</Badge>
                                <code className="text-sm text-gray-600">{action.target}</code>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(action.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <MousePointer className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No user actions captured</p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{report.description}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
