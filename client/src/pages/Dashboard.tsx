import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import { Bug, FolderOpen, AlertCircle, CheckCircle, Clock, Plus, Settings } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.bugReports.stats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: projectsList, isLoading: projectsLoading } = trpc.projects.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
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
            <CardTitle>Bug Capture Tool</CardTitle>
            <CardDescription>
              Capture screenshots, console logs, and network traffic for debugging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In to Continue</a>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bug className="w-8 h-8 text-primary" />
              <h1 className="text-xl font-semibold">Bug Capture Tool</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name || "User"}</span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/projects">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Projects
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/integration">
                  <Settings className="w-4 h-4 mr-2" />
                  Integration
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reports</CardTitle>
              <Bug className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">New</CardTitle>
              <AlertCircle className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-blue-600">{stats?.new || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
              <Clock className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-yellow-600">{stats?.inProgress || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Resolved</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Priority Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Reports by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-6" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Badge variant="destructive">Critical</Badge>
                    </span>
                    <span className="font-semibold">{stats?.byPriority?.critical || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Badge className="bg-orange-500">High</Badge>
                    </span>
                    <span className="font-semibold">{stats?.byPriority?.high || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Badge className="bg-yellow-500">Medium</Badge>
                    </span>
                    <span className="font-semibold">{stats?.byPriority?.medium || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary">Low</Badge>
                    </span>
                    <span className="font-semibold">{stats?.byPriority?.low || 0}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Projects</CardTitle>
              <CardDescription>
                {projectsLoading ? "Loading..." : `${projectsList?.length || 0} projects`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : projectsList && projectsList.length > 0 ? (
                <div className="space-y-2">
                  {projectsList.slice(0, 5).map((project) => (
                    <Link
                      key={project.id}
                      href={`/reports?projectId=${project.id}`}
                      className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">{project.name}</div>
                      {project.description && (
                        <div className="text-sm text-gray-500 truncate">{project.description}</div>
                      )}
                    </Link>
                  ))}
                  {projectsList.length > 5 && (
                    <Button variant="ghost" className="w-full" asChild>
                      <Link href="/projects">View all projects</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-4">No projects yet</p>
                  <Button asChild>
                    <Link href="/projects">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Project
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <Link href="/reports">
                  <Bug className="w-4 h-4 mr-2" />
                  View All Reports
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/projects">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/integration">
                  <Settings className="w-4 h-4 mr-2" />
                  SDK Integration Guide
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
