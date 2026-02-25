"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import FadeInSection from "@/components/animations/FadeInSection";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useAuth } from "@/lib/auth";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  pendingCases: number;
  closedCases: number;
  recentContacts: number;
  dispatchedContacts: number;
  dailyIncidents: Array<{
    date: string;
    count: number;
  }>;
}

const DashboardContent = () => {
  const { createAuthHeaders, user, loading: authLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("24h");

  console.log("DashboardContent render:", { authLoading, user, loading });

  useEffect(() => {
    console.log("DashboardContent useEffect triggered:", { authLoading, user, loading });
    
    const fetchStats = async () => {
      // Skip if auth is still loading or not authenticated
      if (authLoading || !isAuthenticated) {
        console.log("Skipping fetchStats:", { authLoading, user });
        return;
      }

      console.log("Fetching dashboard stats");
      setLoading(true);
      setError(null);

      try {
        console.log("Creating auth headers");
        const headers = await createAuthHeaders();
        console.log("Auth headers created:", headers);
        
        const response = await fetch(
          `/api/dashboard/stats?timeRange=${timeRange}`,
          {
            credentials: 'include',
            headers
          }
        );
        console.log("Dashboard stats response:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Dashboard stats data:", data);
        setStats(data);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while fetching stats"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeRange, createAuthHeaders, authLoading, isAuthenticated]);

  const chartData = {
    labels: stats?.dailyIncidents.map((d) => d.date) || [],
    datasets: [
      {
        label: "Daily Incidents",
        data: stats?.dailyIncidents.map((d) => d.count) || [],
        backgroundColor: "rgba(59, 130, 246, 0.5)", // blue-500 with opacity
        borderColor: "rgb(59, 130, 246)", // blue-500
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Daily Incidents (Past 30 Days)",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
          <p>Please log in to view the dashboard.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <h2 className="text-lg font-semibold mb-2">
            Error Loading Dashboard
          </h2>
          <p>{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FadeInSection>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your organization's activity
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
              <Badge>{stats?.totalCases || 0}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCases || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total cases in the system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Cases
              </CardTitle>
              <Badge variant="default">{stats?.activeCases || 0}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeCases || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active cases
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Contacts
              </CardTitle>
              <Badge variant="secondary">{stats?.recentContacts || 0}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.recentContacts || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                New contacts in selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
              <Badge variant="outline">{stats?.dispatchedContacts || 0}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.dispatchedContacts || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Contacts dispatched to case managers
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Incidents</CardTitle>
            <CardDescription>
              Number of incidents reported per day over the past month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </FadeInSection>
  );
};

export default DashboardContent;
