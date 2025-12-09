import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bug, ArrowLeft, Search, ExternalLink, Monitor, Globe, Clock } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useState, useMemo } from "react";

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

export default function Reports() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const projectIdParam = searchParams.get("projectId");

  const [filters, setFilters] = useState({
    projectId: projectIdParam ? parseInt(projectIdParam) : undefined,
    status: undefined as "new" | "in_progress" | "resolved" | "closed" | undefined,
    priority: undefined as "low" | "medium" | "high" | "critical" | undefined,
    search: "",
  });
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: projects } = trpc.projects.list.useQuery();

  const { data, isLoading } = trpc.bugReports.list.useQuery({
    projectId: filters.projectId,
    status: filters.status,
    priority: filters.priority,
    search: filters.search || undefined,
    limit,
    offset: page * limit,
  });

  const totalPages = useMemo(() => {
    if (!data?.total) return 0;
    return Math.ceil(data.total / limit);
  }, [data?.total]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <Bug className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">Bug Reports</h1>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search reports..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value });
                    setPage(0);
                  }}
                />
              </div>
            </div>
            <Select
              value={filters.projectId?.toString() || "all"}
              onValueChange={(value) => {
                setFilters({ ...filters, projectId: value === "all" ? undefined : parseInt(value) });
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => {
                setFilters({
                  ...filters,
                  status: value === "all" ? undefined : (value as typeof filters.status),
                });
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.priority || "all"}
              onValueChange={(value) => {
                setFilters({
                  ...filters,
                  priority: value === "all" ? undefined : (value as typeof filters.priority),
                });
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : data?.reports && data.reports.length > 0 ? (
          <>
            <div className="space-y-4">
              {data.reports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Link
                            href={`/report/${report.id}`}
                            className="text-lg font-medium hover:text-primary truncate"
                          >
                            {report.title || "Untitled Bug Report"}
                          </Link>
                          <Badge className={statusColors[report.status]}>
                            {report.status.replace("_", " ")}
                          </Badge>
                          <Badge className={priorityColors[report.priority]}>
                            {report.priority}
                          </Badge>
                        </div>
                        {report.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {report.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            <span className="truncate max-w-[200px]">{report.pageUrl}</span>
                          </span>
                          {report.deviceInfo && (
                            <span className="flex items-center gap-1">
                              <Monitor className="w-4 h-4" />
                              {(report.deviceInfo as any).platform}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(report.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.screenshotUrl && (
                          <img
                            src={report.screenshotUrl}
                            alt="Screenshot"
                            className="w-24 h-16 object-cover rounded border"
                          />
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/report/${report.id}`}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <p className="text-sm text-gray-500">
                  Showing {page * limit + 1} - {Math.min((page + 1) * limit, data.total)} of {data.total} reports
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Bug className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Bug Reports Found</h3>
              <p className="text-gray-500">
                {filters.search || filters.status || filters.priority
                  ? "Try adjusting your filters"
                  : "Bug reports will appear here once submitted via the SDK"}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
