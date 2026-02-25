"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/organizations/status");
        if (!response.ok) throw new Error("Failed to fetch status");
        
        const data = await response.json();
        setStatus(data.status);

        if (data.status === "approved") {
          // If approved, redirect to dashboard
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error checking status:", error);
      } finally {
        setLoading(false);
      }
    };

    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    checkStatus(); // Initial check

    return () => clearInterval(interval);
  }, [router]);

  if (loading) {
    return (
      <div className="container max-w-2xl py-10 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Organization Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "pending" && (
            <>
              <p className="text-muted-foreground">
                Your organization is currently under review. We will notify you via email once your
                organization has been approved.
              </p>
              <p className="text-sm text-muted-foreground">
                This process typically takes 1-2 business days. You will receive an email at the
                contact email address you provided when your organization is approved.
              </p>
            </>
          )}

          {status === "rejected" && (
            <>
              <p className="text-destructive">
                Your organization application has been rejected. Please contact support for more
                information.
              </p>
              <Button
                onClick={() => router.push("/onboarding")}
                variant="outline"
              >
                Try Again
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 